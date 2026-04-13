import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Printer, Minus, Plus, Type, Zap, AlignVerticalSpaceAround, Rows3, X, Check, Loader2, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotuloItem, PharmacyConfig, LayoutConfig, LayoutType } from "@/types/requisicao";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

// ---- Word-wrap utility ----
function wrapText(text: string, maxCols: number, maxLines: number): string {
  const inputLines = text.split('\n');
  const wrapped: string[] = [];

  for (const line of inputLines) {
    if (line.length <= maxCols) {
      wrapped.push(line);
    } else {
      let remaining = line;
      while (remaining.length > maxCols) {
        // Find last space before limit
        let breakAt = remaining.lastIndexOf(' ', maxCols);
        if (breakAt <= 0) {
          // No space found — force break at maxCols
          breakAt = maxCols;
        }
        wrapped.push(remaining.substring(0, breakAt));
        remaining = remaining.substring(breakAt).trimStart();
      }
      if (remaining.length > 0) {
        wrapped.push(remaining);
      }
    }
    if (wrapped.length >= maxLines) break;
  }

  return wrapped.slice(0, maxLines).join('\n');
}

// ---- Truncate utility (for fixed-grid layouts like A_PAC_PEQ) ----
function truncateText(text: string, maxCols: number, maxLines: number): string {
  const lines = text.split('\n').slice(0, maxLines);
  return lines.map(line => line.substring(0, maxCols)).join('\n');
}

function isAmp10SavedTextValid(textoLivre: string, rotulo: RotuloItem): boolean {
  const lines = textoLivre
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 5 || lines.length > 10) return false;
  if (!lines.every((line) => line.startsWith('   '))) return false;

  const reqToken = `REQ:${padReqNumber(rotulo.nrRequisicao || '')}-${rotulo.nrItem || '0'}`;
  if (!lines[0]?.includes(reqToken) || /REQ:\s*$/.test(lines[0])) return false;
  if (!lines[1]?.includes('DR(A)')) return false;

  if (rotulo.numeroCRM && !lines[1].includes(String(rotulo.numeroCRM))) return false;
  if (rotulo.ufCRM && !lines[1].toUpperCase().includes(String(rotulo.ufCRM).toUpperCase())) return false;

  const usoLine = lines.find((line) => line.includes('USO'));
  const contemLine = lines.find((line) => line.includes('CONTEM:'));
  if (!usoLine || !contemLine) return false;
  if (contemLine.includes('REG:')) return false;

  if (rotulo.aplicacao) {
    const apToken = `AP:${String(rotulo.aplicacao).trim().toUpperCase()}`;
    if (!usoLine.toUpperCase().includes(apToken)) return false;
  }

  if (rotulo.numeroRegistro) {
    const regToken = `REG:${rotulo.numeroRegistro}`;
    if (!usoLine.includes(regToken) || /REG:\s*$/.test(usoLine)) return false;
  }

  return true;
}

// ---- Abbreviate name to fit maxLen ----
// Rules: never abbreviate first name, never abbreviate last name.
// Abbreviate middle names, keeping first + last name intact.
// forceAbbreviate=true: always abbreviate even with just 1 middle name (used for PEQ doctor).
// forceAbbreviate=false (default): only abbreviate when 3+ surnames (4+ parts).
function abbreviateName(name: string, maxLen: number, forceAbbreviate: boolean = false): string {
  if (name.length <= maxLen) return name;
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length <= 1) return name.substring(0, maxLen);

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1);

  // Without force: only abbreviate when 3+ surnames (4+ parts)
  if (!forceAbbreviate && middle.length <= 1) {
    return name.substring(0, maxLen);
  }

  // If there are middle names, abbreviate them
  if (middle.length > 0) {
    const attempts: string[] = [];
    // 1. First + middle initials (spaced) + Last: "KAROLINY A. V. VIEIRA"
    attempts.push([first, ...middle.map(p => p[0] + '.'), last].join(' '));
    // 2. First + middle initials (compact) + Last: "KAROLINY A.V.VIEIRA"
    attempts.push(first + ' ' + middle.map(p => p[0] + '.').join('') + last);
    // 3. First + Last only (drop middle entirely)
    attempts.push(first + ' ' + last);

    for (const attempt of attempts) {
      if (attempt.length <= maxLen) return attempt;
    }
  }

  // Fallback: first + last, truncated if needed
  const firstLast = first + ' ' + last;
  if (firstLast.length <= maxLen) return firstLast;
  return firstLast.substring(0, maxLen);
}

// ---- Strict abbreviation: ALWAYS keep first + last name, abbreviate/drop middle ----
// Unlike abbreviateName, this NEVER truncates mid-word. First and last are sacred.
function abbreviateNameStrict(name: string, maxLen: number): string {
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length <= 1) return (parts[0] || '').substring(0, maxLen);
  
  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1);

  // Try full name first
  if (name.length <= maxLen) return name;

  // Try first + compact initials + space + last → "ADRIANA A.D.C. OLIVEIRA"
  if (middle.length > 0) {
    const compactSpaced = first + ' ' + middle.map(p => p[0] + '.').join('') + ' ' + last;
    if (compactSpaced.length <= maxLen) return compactSpaced;

    // Try without space before last → "ADRIANA A.D.C.OLIVEIRA"
    const compactNoSpace = first + ' ' + middle.map(p => p[0] + '.').join('') + last;
    if (compactNoSpace.length <= maxLen) return compactNoSpace;
  }

  // First + last only (drop all middle names)
  const firstLast = first + ' ' + last;
  if (firstLast.length <= maxLen) return firstLast;

  // Last resort: still keep first + last but truncate last name to fit
  // This should rarely happen since we have ~30 chars available
  const available = maxLen - first.length - 1;
  if (available > 3) return first + ' ' + last.substring(0, available);
  return first.substring(0, maxLen);
}

// ---- Pad line utility: align left+right within fixed width ----
function padLine(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space <= 0) return (left + right).substring(0, width);
  return left + ' '.repeat(space) + right;
}

interface LabelTextEditorProps {
  rotulos: RotuloItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onTextChange: (id: string, text: string | undefined) => void;
  layoutConfig: LayoutConfig;
  layoutType: LayoutType;
  pharmacyConfig: PharmacyConfig;
  searchedRequisition: string;
  // Print
  onPrint: (quantity: number) => void;
  onPrintAll: (quantity: number) => void;
  onPrintFcRaw?: () => void;
  isPrinting: boolean;
  availablePrinters: string[];
  selectedPrinter: string;
  onPrinterChange: (printer: string) => void;
  onClose?: () => void;
}

// ---- text generation (reused from LabelCard logic) ----

const formatarDataCurta = (data: string) => {
  if (!data) return "";
  const partes = data.split('/');
  if (partes.length === 3) return `${partes[1]}/${partes[2].slice(-2)}`;
  return data;
};

const limparNomeProduto = (nome: string): string => {
  if (!nome) return "";
  let n = nome.trim().toUpperCase();
  // Remove prefixos comuns
  const prefixos = ["AMP ", "FRS ", "FR ", "BIS ", "ENV "];
  for (const p of prefixos) {
    if (n.startsWith(p)) { n = n.substring(p.length); break; }
  }
  // Remove sufixos de via de administração
  const sufixos = [" ENDOVENOSO", " ENDOVENOSA", " ENDOVE", " ENDOV", " ENDOVEN", " IV ", " IV"];
  for (const s of sufixos) {
    if (n.endsWith(s.trimEnd())) { n = n.substring(0, n.length - s.trimEnd().length).trimEnd(); break; }
  }
  // Remove sufixos de volume (ex: " - 2ML", " 2ML", " 5ML", " 10ML")
  n = n.replace(/\s*-\s*\d+(?:[.,]\d+)?\s*ML\s*$/i, "").trimEnd();
  n = n.replace(/\s+\d+(?:[.,]\d+)?\s*ML\s*$/i, "").trimEnd();
  return n;
};

const formatarFormula = (formula: string) => {
  if (!formula) return "";
  return limparNomeProduto(formula);
};

const formatarNomeComponente = (nome: string): string => {
  return limparNomeProduto(nome);
};

const isValidComposicao = (texto: string): boolean => {
  if (!texto?.trim()) return false;
  // Reject purely numeric/punctuation strings
  if (/^[\d.,;\s]+$/.test(texto.trim())) return false;
  // Reject IBPT/tax data (semicolon-separated numbers, fiscal codes)
  if (/IBPT|EMPRESOMETRO|NCM:|CFOP:|CST:/i.test(texto)) return false;
  if ((texto.match(/;/g) || []).length >= 3) return false;
  return true;
};

const tiposPrescritores: Record<string, { conselho: string }> = {
  '1': { conselho: 'CRM' }, '2': { conselho: 'CRO' }, '3': { conselho: 'CRMV' },
  '4': { conselho: '' }, '5': { conselho: 'CRP' }, '6': { conselho: 'CRF' },
  '7': { conselho: 'CRBM' }, '8': { conselho: 'CRFA' }, '9': { conselho: 'CRN' },
  'A': { conselho: 'CREFITO' }, 'B': { conselho: 'CREFITO' }, 'C': { conselho: 'COREN' },
  'D': { conselho: 'RMS' }, 'E': { conselho: 'CRBio' }, 'F': { conselho: 'CRO' },
};

// ---- A_PAC_PEQ specific generator (compact fixed grid, distinct from GRAN) ----
function generateTextPacPeq(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const maxCols = layoutConfig.colunasMax || 41;

  // Line 1: PACIENTE + REQ na mesma linha (mesmo Y no PPLA: Y=188)
  const reqNum = `${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`.substring(0, 7);
  const req = `REQ:${reqNum}`;
  const pacienteMax = Math.min(maxCols - req.length - 1, 25); // limite físico: espaço entre X=12 e X=116
  const paciente = abbreviateNameStrict((rotulo.nomePaciente || "").toUpperCase(), pacienteMax);
  const line1 = padLine(paciente, req, maxCols);

  // Line 2: DR(A)MEDICO + CONSELHO — obrigatório: primeiro e último nome inteiros
  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoNome = tipo.conselho || 'CRM';
  const conselhoStr = rotulo.numeroCRM
    ? `${conselhoNome}-${rotulo.ufCRM || '??'}-${rotulo.numeroCRM}`.substring(0, 15)
    : "";
  // Espaço disponível para o nome do médico (descontando "DR(A)" e conselho)
  const medicoMax = conselhoStr ? maxCols - 5 - conselhoStr.length - 1 : maxCols - 5;
  // Abreviar obrigatoriamente: primeiro nome + último sobrenome inteiros, meio vira inicial ou é removido
  const medico = rotulo.nomeMedico ? abbreviateNameStrict(rotulo.nomeMedico.toUpperCase(), Math.max(0, medicoMax)) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  const line2 = padLine(drName, conselhoStr, maxCols);

  // Line 3: REG alinhado à direita (Y=138, X=190 no PPLA)
  const regNum = String(rotulo.numeroRegistro || "");
  const reg = regNum ? `REG:${regNum}` : "";
  const lineReg = reg ? padLine("", reg, maxCols) : "";

  return [line1, line2, lineReg].filter(l => l.trim()).join('\n');
}

// ---- Clean patient name: remove leading phone numbers/digits ----
function cleanPatientName(name: string): string {
  if (!name) return "";
  // Remove leading digits, spaces, and phone-like patterns (e.g. "57 988 335 ")
  return name.replace(/^[\d\s]+/, '').trim();
}

// ---- Zero-pad requisition number to 6 digits ----
function padReqNumber(nr: string): string {
  if (!nr) return "000000";
  const num = nr.replace(/\D/g, '');
  return num.padStart(6, '0');
}

// ---- Format conselho like FC: CONSELHO.UF-NUMERO (dot notation) ----
function formatConselhoFC(prefixoCRM: string, ufCRM: string, numeroCRM: string): string {
  const codigo = (prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  if (!tipo.conselho || !ufCRM || !numeroCRM) return "";
  // If prefixoCRM is already a council name (not a single char code), use it directly with dot
  if (codigo.length > 1 && !/^\d+$/.test(codigo)) {
    return `${codigo}.${ufCRM}-${numeroCRM}`;
  }
  return `${tipo.conselho}.${ufCRM}-${numeroCRM}`;
}

// ---- AMP_CX specific generator — FIXED POSITION FIELD MAP ----
// Each line has anchored left/right zones with max widths.
// Content never shifts other fields — overflow is truncated.
function generateTextAmpCx(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const W = layoutConfig.colunasMax || 73;

  // === Helper: compact line — left + small gap + right (same pattern as AMP10/GRAN) ===
  const compactLine = (left: string, right: string, gapSize = 4): string => {
    const r = (right || "").trim();
    if (!r) return (left || "").substring(0, W);
    const safeGap = ' '.repeat(Math.max(gapSize, 1));
    const leftMax = Math.max(W - r.length - safeGap.length, 0);
    const l = (left || "").substring(0, leftMax).trimEnd();
    return `${l}${safeGap}${r}`.substring(0, W);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;
  const conselhoStr = formatConselhoFC(rotulo.prefixoCRM, rotulo.ufCRM, rotulo.numeroCRM);

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;

  const lines: string[] = [];

  // ── LINE 1: Paciente (left) | REQ (right) — compact gap ──
  lines.push(compactLine(cleanName, reqStr, 4));

  // ── LINE 2: DR(A)+Medico (left) | Conselho (right) — compact gap ──
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(compactLine(drName, conselhoStr, 3));

  // ── LINES 3-4: Produto (left-anchored, up to 2 lines, word-wrap) ──
  if (isKit && rotulo.componentes) {
    const componentesVisiveis = rotulo.componentes.filter(comp => {
      const nome = comp.nome?.toUpperCase() || '';
      return !nome.startsWith('BLISTER') && !nome.startsWith('CAIXA MED');
    });
    componentesVisiveis.forEach(comp => {
      const nomeExibicao = rotulo.eSinonimo
        ? (comp.composicao || formatarNomeComponente(comp.nome))
        : formatarNomeComponente(comp.nome);
      const meta: string[] = [];
      const compPhVal = comp.ph ? String(comp.ph).replace('.', ',') : '';
      meta.push(`PH:${compPhVal}`);
      if (comp.lote) meta.push(`L:${comp.lote}`);
      if (comp.fabricacao) meta.push(`F:${formatarDataCurta(comp.fabricacao)}`);
      if (comp.validade) meta.push(`V:${formatarDataCurta(comp.validade)}`);
      const metaStr = meta.join(" ");
      const maxNome = metaStr ? W - metaStr.length - 1 : W;
      const lineText = metaStr ? `${nomeExibicao.substring(0, maxNome)} ${metaStr}` : nomeExibicao;
      lines.push(lineText.substring(0, W));
    });
  } else {
    const mescla = isValidComposicao(rotulo.composicao || "");
    const produtoText = mescla
      ? (rotulo.composicao || "").toUpperCase()
      : formatarFormula(rotulo.formula);
    if (produtoText) {
      wrapText(produtoText, W, 2).split('\n').forEach(l => lines.push(l));
    }
  }

  // ── LINE 5: pH | Lote | Fabricação | Validade (compact inline) ──
  const phVal = rotulo.ph ? `PH:${String(rotulo.ph).replace('.', ',')}` : 'PH:';
  let loteStr = '';
  if (rotulo.lote) {
    if (rotulo.lote.includes('/')) {
      loteStr = `L:${rotulo.lote}`;
    } else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      loteStr = `L:${rotulo.lote}${ano ? '/' + ano : ''}`;
    }
  } else {
    loteStr = 'L:';
  }
  const fabStr = rotulo.dataFabricacao ? `F:${formatarDataCurta(rotulo.dataFabricacao)}` : 'F:';
  const valStr = rotulo.dataValidade ? `V:${formatarDataCurta(rotulo.dataValidade)}` : 'V:';
  const metaParts = [phVal, loteStr, fabStr, valStr].filter(Boolean);
  lines.push(metaParts.join('  ').substring(0, W));

  // ── LINE 6: Uso (left) | Aplicação (right) — compact gap ──
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const usoText = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `APLICACAO:${aplicacao}` : "";
  lines.push(compactLine(usoText, aplicacaoStr, 4));

  // ── LINE 7: Contém (left) | REG (right) — compact gap ──
  const contemStr = rotulo.contem?.trim() ? `CONTEM:${rotulo.contem.trim().toUpperCase()}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(compactLine(contemStr, regStr, 4));

  return lines.join('\n');
}

// ---- A_PAC_GRAN specific generator — COMPACT SAFE MAP ----
// 73 cols, 2 linhas. REQ/conselho/REG ficam compactados à esquerda o suficiente
// para não cortar no físico, sem sobrepor o bloco principal.
function generateTextPacGran(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const W = layoutConfig.colunasMax || 73;

  const compactLine = (left: string, right: string, gapSize = 1): string => {
    const r = (right || "").trim();
    if (!r) return (left || "").substring(0, W);

    const safeGap = ' '.repeat(Math.max(gapSize, 1));
    const leftMax = Math.max(W - r.length - safeGap.length, 0);
    const l = (left || "").substring(0, leftMax).trimEnd();

    return `${l}${safeGap}${r}`.substring(0, W);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoNome = tipo.conselho || 'CRM';
  const conselhoStr = rotulo.numeroCRM
    ? `${conselhoNome}-${rotulo.ufCRM || '??'}-${rotulo.numeroCRM}`
    : "";

  const regNum = String(rotulo.numeroRegistro || "");
  const regStr = regNum ? `REG:${regNum}` : "";

  // Combinar conselho + REG de forma compacta, sem jogar o bloco para a extrema direita
  const rightL2 = [conselhoStr, regStr].filter(Boolean).join(' ');

  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  // A_PAC_GRAN: preservar o nome o máximo possível, mas reservar o espaço real do bloco da direita
  const medicoMax = Math.max(W - rightL2.length - 6, 10); // 5 = "DR(A)" + 1 espaço
  const medicoTrunc = medico ? medico.substring(0, medicoMax) : "";
  const drName = medicoTrunc ? `DR(A)${medicoTrunc}` : "";

  const lines: string[] = [];

  // L1: Paciente + REQ com folga curta para não empurrar REQ para a borda física
  lines.push(compactLine(cleanName, reqStr, 2));

  // L2: DR(A)+Medico + Conselho + REG de forma contínua, como no print de referência
  lines.push(compactLine(drName, rightL2, 1));

  return lines.join('\n');
}

function getConselhoNome(prefixoCRM: string): string {
  const codigo = (prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  return tipo.conselho || 'CRM';
}
// Detecta formato antigo do AMP_CX (fixedLine com gaps enormes → precisa regenerar compacto)
function shouldRegenerateAmpCxText(textoLivre: string): boolean {
  const nonEmptyLines = textoLivre
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0);

  if (nonEmptyLines.length < 2) return true;

  const line1 = nonEmptyLines[0];
  const reqIndex = line1.indexOf('REQ:');
  if (reqIndex === -1) return true;

  // No formato antigo, o nome do paciente termina e há um gap enorme antes do REQ.
  // Detectar: se o texto antes de REQ tem mais de 10 espaços consecutivos, é formato antigo.
  const beforeReq = line1.substring(0, reqIndex);
  const trailingSpaces = beforeReq.length - beforeReq.trimEnd().length;
  if (trailingSpaces > 10) return true;

  // Detectar meta line com zonas fixas de 18 chars (formato antigo fixedMetaLine)
  const metaLine = nonEmptyLines.find(l => l.startsWith('PH:') || l.startsWith('pH:'));
  if (metaLine && metaLine.length >= 70) {
    // Formato antigo: PH:               L:521/25          F:12/25              V:12/26
    // Verifica se há blocos de 10+ espaços entre os campos
    const gapMatch = metaLine.match(/\S\s{10,}\S/);
    if (gapMatch) return true;
  }

  return false;
}


function shouldRegeneratePacGranText(textoLivre: string, rotulo: RotuloItem): boolean {
  const nonEmptyLines = textoLivre
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0);

  if (nonEmptyLines.length < 2) return true;

  const [line1, line2] = nonEmptyLines;
  if (!line1.includes('REQ:')) return true;
  if (!line2.includes('DR(A)')) return true;

  if (rotulo.numeroRegistro && !line2.includes('REG:')) return true;

  if (rotulo.numeroCRM) {
    const conselhoNome = getConselhoNome(rotulo.prefixoCRM || '1');
    if (
      conselhoNome &&
      !line2.includes(`${conselhoNome}-`) &&
      !line2.includes(`${conselhoNome}.`)
    ) {
      return true;
    }
  }

  const reqIndex = line1.indexOf('REQ:');
  if (reqIndex === -1 || reqIndex > 48) return true;

  const conselhoNome = getConselhoNome(rotulo.prefixoCRM || '1');
  const rightMarkers = [
    'REG:',
    `${conselhoNome}-`,
    `${conselhoNome}.`,
  ];
  const rightMarkerPositions = rightMarkers
    .map(marker => line2.indexOf(marker))
    .filter(position => position >= 0);

  if (rightMarkerPositions.length > 0 && Math.min(...rightMarkerPositions) > 48) {
    return true;
  }

  // Invalidar se a linha 1 não tem 73 colunas (formatação antiga com 57)
  if (line1.length < 70) return true;

  return false;
}

// ---- AMP10 specific generator — COMPACT INDENTED FIELD MAP ----
// 65 cols, 10 lines. 3-space left indent to avoid physical left-edge clipping.
// Right-side fields (REQ, Conselho, REG) use compact gap (not anchored far-right).
function generateTextAmp10(rotulo: RotuloItem, layoutConfig: LayoutConfig, options?: { metaInline?: boolean }): string {
  const W = layoutConfig.colunasMax || 65;
  const INDENT = '   '; // 3-space left indent (physical label margin)
  const CW = W - INDENT.length; // content width after indent

  // Compact line: left + small gap + right, then indent prefix
  const compactLine = (left: string, right: string, gapSize = 5): string => {
    const r = (right || "").trim();
    if (!r) return INDENT + (left || "").substring(0, CW);
    const safeGap = ' '.repeat(Math.max(gapSize, 1));
    const leftMax = Math.max(CW - r.length - safeGap.length, 0);
    const l = (left || "").substring(0, leftMax).trimEnd();
    return INDENT + `${l}${safeGap}${r}`.substring(0, CW);
  };

  const indentLine = (text: string): string => {
    return INDENT + (text || "").substring(0, CW);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const conselhoStr = formatConselhoFC(rotulo.prefixoCRM, rotulo.ufCRM, rotulo.numeroCRM);

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;
  const lines: string[] = [];

  // ── LINE 1: Paciente (left) | REQ (right) — compact gap ──
  lines.push(compactLine(cleanName, reqStr, 5));

  // ── LINE 2: DR(A)+Medico (left) | Conselho (right) — compact gap ──
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(compactLine(drName, conselhoStr, 3));

  // ── LINES 3+: Produto/Componentes ──
  if (isKit && rotulo.componentes) {
    const componentesVisiveis = rotulo.componentes.filter(comp => {
      const nome = comp.nome?.toUpperCase() || '';
      return !nome.startsWith('BLISTER') && !nome.startsWith('CAIXA MED');
    });
    componentesVisiveis.forEach(comp => {
      const nomeExibicao = rotulo.eSinonimo
        ? (comp.composicao || formatarNomeComponente(comp.nome))
        : formatarNomeComponente(comp.nome);
      const meta: string[] = [];
      const compPhVal = comp.ph ? String(comp.ph).replace('.', ',') : '';
      meta.push(`pH:${compPhVal}`);
      if (comp.lote) meta.push(`L:${comp.lote}`);
      if (comp.fabricacao) meta.push(`F:${formatarDataCurta(comp.fabricacao)}`);
      if (comp.validade) meta.push(`V:${formatarDataCurta(comp.validade)}`);
      const metaStr = meta.join(" ");
      if (options?.metaInline && metaStr) {
        const maxNome = CW - metaStr.length - 2;
        lines.push(indentLine(`${nomeExibicao.substring(0, maxNome)}  ${metaStr}`));
      } else {
        lines.push(indentLine(nomeExibicao));
        if (metaStr) lines.push(indentLine(metaStr));
      }
    });
  } else {
    const mescla = isValidComposicao(rotulo.composicao || "");
    if (mescla) {
      wrapText(rotulo.composicao!.toUpperCase(), CW, 3).split('\n').forEach(l => lines.push(indentLine(l)));
    } else {
      const f = formatarFormula(rotulo.formula);
      if (f) lines.push(indentLine(f));
    }
  }

  // ── pH | Lote | Fabricação | Validade (inline compact) ──
  const phVal = rotulo.ph ? `pH:${String(rotulo.ph).replace('.', ',')}` : 'pH:';
  let loteStr = '';
  if (rotulo.lote) {
    if (rotulo.lote.includes('/')) {
      loteStr = `L:${rotulo.lote}`;
    } else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      loteStr = `L:${rotulo.lote}${ano ? '/' + ano : ''}`;
    }
  }
  const fabStr = rotulo.dataFabricacao ? `F:${formatarDataCurta(rotulo.dataFabricacao)}` : '';
  const valStr = rotulo.dataValidade ? `V:${formatarDataCurta(rotulo.dataValidade)}` : '';
  const metaParts = [phVal, loteStr, fabStr, valStr].filter(Boolean);
  lines.push(indentLine(metaParts.join(' ')));

  // ── USO | AP:... (full line, no REG here) ──
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const usoText = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `AP:${aplicacao}` : "";
  const leftPart = usoText + (aplicacaoStr ? '  ' + aplicacaoStr : '');
  lines.push(indentLine(leftPart));

  // ── CONTEM (left) | REG (right) — compact gap ──
  const contemStr = rotulo.contem?.trim() ? `CONTEM:${rotulo.contem.trim().toUpperCase()}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "REG:";
  lines.push(compactLine(contemStr, regStr, 3));

  return lines.join('\n');
}

// ---- TIRZ specific generator — FIXED POSITION FIELD MAP ----
// 73 cols, 8 lines. Same anchored-zone pattern as AMP_CX.
function generateTextTirz(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const W = layoutConfig.colunasMax || 73;

  // === Zone widths ===
  const REQ_WIDTH = 18;
  const CONSELHO_WIDTH = 20;
  const APLICACAO_WIDTH = 25;
  const REG_WIDTH = 20;

  const LEFT_L1 = W - REQ_WIDTH;
  const LEFT_L2 = W - CONSELHO_WIDTH;
  const LEFT_USO = W - APLICACAO_WIDTH;
  const LEFT_CONTEM = W - REG_WIDTH;

  const fixedLine = (left: string, right: string, leftMax: number, rightMax: number): string => {
    const l = (left || "").substring(0, leftMax);
    const r = (right || "").substring(0, rightMax);
    const gap = W - l.length - r.length;
    if (gap <= 0) return (l + r).substring(0, W);
    return l + ' '.repeat(gap) + r;
  };

  const fixedMetaLine = (ph: string, lote: string, fab: string, val: string): string => {
    const zoneW = Math.floor(W / 4);
    const zones = [ph, lote, fab, val];
    return zones.map(z => (z || "").substring(0, zoneW).padEnd(zoneW)).join("").substring(0, W);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const conselhoStr = formatConselhoFC(rotulo.prefixoCRM, rotulo.ufCRM, rotulo.numeroCRM);

  const lines: string[] = [];

  // ── LINE 1: Paciente (left) | REQ (right) ──
  lines.push(fixedLine(cleanName, reqStr, LEFT_L1, REQ_WIDTH));

  // ── LINE 2: DR(A)+Medico (left) | Conselho (right) ──
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(fixedLine(drName, conselhoStr, LEFT_L2, CONSELHO_WIDTH));

  // ── LINE 3: Fórmula/Produto (full width, 1 line) ──
  const f = formatarFormula(rotulo.formula);
  if (f) lines.push(f.substring(0, W));

  // ── LINE 4: Posologia (full width, 1 line) ──
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const posologiaValida = /^\d+$/.test(posologia) ? "" : posologia;
  if (posologiaValida) lines.push(posologiaValida.substring(0, W));

  // ── LINE 5: pH | Lote | Fabricação | Validade (fixed 4-zone) ──
  const phVal = rotulo.ph ? `PH:${String(rotulo.ph).replace('.', ',')}` : 'PH:';
  let loteStr = '';
  if (rotulo.lote) {
    if (rotulo.lote.includes('/')) {
      loteStr = `L:${rotulo.lote}`;
    } else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      loteStr = `L:${rotulo.lote}${ano ? '/' + ano : ''}`;
    }
  }
  const fabStr = rotulo.dataFabricacao ? `F:${formatarDataCurta(rotulo.dataFabricacao)}` : '';
  const valStr = rotulo.dataValidade ? `V:${formatarDataCurta(rotulo.dataValidade)}` : '';
  lines.push(fixedMetaLine(phVal, loteStr, fabStr, valStr));

  // ── LINE 6: Uso (left) | Aplicação (right) ──
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `APLICACAO:${aplicacao}` : "";
  const usoText = rotulo.tipoUso?.toUpperCase() || "";
  lines.push(fixedLine(usoText, aplicacaoStr, LEFT_USO, APLICACAO_WIDTH));

  // ── LINE 7: Contém (left) | REG (right) ──
  const contemStr = rotulo.contem?.trim() ? `CONTEM:${rotulo.contem.trim().toUpperCase()}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(fixedLine(contemStr, regStr, LEFT_CONTEM, REG_WIDTH));

  return lines.join('\n');
}

function resolveLayoutTipo(layoutConfig: LayoutConfig, layoutType?: LayoutType): LayoutType {
  if (layoutType) return layoutType;

  const rawTipo = (layoutConfig.tipo || "").toString().trim().toUpperCase().replace(/\./g, "_");
  if (rawTipo === 'A_PAC_PEQ' || rawTipo === 'A_PAC_GRAN' || rawTipo === 'AMP_CX' || rawTipo === 'AMP10' || rawTipo === 'TIRZ') {
    return rawTipo as LayoutType;
  }

  // Fallback por limites físicos do layout (evita quebrar quando tipo vem legado)
  if ((layoutConfig.colunasMax === 28 || layoutConfig.colunasMax === 38 || layoutConfig.colunasMax === 41) && layoutConfig.linhasMax === 8) return 'A_PAC_PEQ';
  if ((layoutConfig.colunasMax === 57 || layoutConfig.colunasMax === 73) && (layoutConfig.linhasMax === 5 || layoutConfig.linhasMax === 8)) return 'A_PAC_GRAN';

  return layoutConfig.tipo;
}

// Remove acentos, cedilha e caracteres especiais (impressora térmica não suporta)
function stripAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^\x20-\x7E\n\r]/g, ''); // keep only basic ASCII printable + newlines
}

function generateText(rotulo: RotuloItem, layoutConfig: LayoutConfig, layoutType?: LayoutType, amp10Options?: { metaInline?: boolean }): string {
  const resolvedLayoutTipo = resolveLayoutTipo(layoutConfig, layoutType);

  let result: string | null = null;

  // Route to specific generators for each layout
  if (resolvedLayoutTipo === 'A_PAC_PEQ') {
    result = generateTextPacPeq(rotulo, layoutConfig);
  } else if (resolvedLayoutTipo === 'A_PAC_GRAN') {
    result = generateTextPacGran(rotulo, layoutConfig);
  } else if (resolvedLayoutTipo === 'AMP_CX') {
    result = generateTextAmpCx(rotulo, layoutConfig);
  } else if (resolvedLayoutTipo === 'AMP10') {
    result = generateTextAmp10(rotulo, layoutConfig, amp10Options);
  } else if (resolvedLayoutTipo === 'TIRZ') {
    result = generateTextTirz(rotulo, layoutConfig);
  }

  if (result !== null) {
    return stripAccents(result);
  }

  const vis = (field: string) => layoutConfig.campoConfig[field as keyof typeof layoutConfig.campoConfig]?.visible !== false;

  const formatarPrescritor = () => {
    if (!rotulo.numeroCRM) return "";
    const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
    const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
    const conselho = tipo.conselho;
    if (rotulo.nomeMedico) {
      if (conselho) return `DR(A)${rotulo.nomeMedico.toUpperCase()}  ${conselho}-${rotulo.ufCRM}-${rotulo.numeroCRM}`;
      return `DR(A)${rotulo.nomeMedico.toUpperCase()}`;
    }
    return `${conselho}-${rotulo.ufCRM}-${rotulo.numeroCRM}`;
  };

  const getAplicacao = (): string => {
    if (rotulo.aplicacao?.trim()) return rotulo.aplicacao.trim().toUpperCase();
    const obs = rotulo.observacoes || "";
    const patterns = [/APLIC(?:AÇÃO|ACAO)?[:\s]+([^\n,;]+)/i, /\b(IV|IM|SC|ID|EV|IDSC|ID\/SC|IM\/SC|SC\/IM)\b/i];
    for (const p of patterns) { const m = obs.match(p); if (m) return m[1].trim().toUpperCase(); }
    return "";
  };

  const formatarLote = () => {
    const lote = rotulo.lote || "";
    if (lote.includes('/')) return lote;
    const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
    return lote ? `${lote}/${ano}` : "";
  };

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;
  const mescla = !isKit && isValidComposicao(rotulo.composicao || "");

  if (isKit && rotulo.componentes) {
    const lines: string[] = [];
    if (vis('paciente') && rotulo.nomePaciente) lines.push(rotulo.nomePaciente.toUpperCase());
    if (vis('medico')) { const p = formatarPrescritor(); if (p) lines.push(p); }
    if (vis('requisicao')) lines.push(`REQ:${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`);
    rotulo.componentes.forEach((comp) => {
      const nomeExibicao = rotulo.eSinonimo ? (comp.composicao || formatarNomeComponente(comp.nome)) : formatarNomeComponente(comp.nome);
      lines.push(nomeExibicao);
      const meta: string[] = [];
      if (vis('ph') && comp.ph) meta.push(`pH:${comp.ph}`);
      if (vis('lote') && comp.lote) meta.push(`L:${comp.lote}`);
      if (vis('fabricacao') && comp.fabricacao) meta.push(`F:${formatarDataCurta(comp.fabricacao)}`);
      if (vis('validade') && comp.validade) meta.push(`V:${formatarDataCurta(comp.validade)}`);
      if (vis('aplicacao') && comp.aplicacao) meta.push(`APLICAÇÃO:${comp.aplicacao}`);
      if (meta.length > 0) lines.push(meta.join("  "));
    });
    const aplicacao = getAplicacao();
    const tipoUso = rotulo.tipoUso?.toUpperCase() || "";
    const tipoUsoValido = /^\d+$/.test(tipoUso) ? "" : tipoUso;
    const usoLine: string[] = [];
    if (vis('tipoUso') && tipoUsoValido) usoLine.push(tipoUsoValido);
    if (vis('aplicacao') && aplicacao) usoLine.push(`APLICAÇÃO:${aplicacao}`);
    if (usoLine.length > 0) lines.push(usoLine.join("  "));
    const contemReg: string[] = [];
    if (vis('contem') && rotulo.contem) contemReg.push(`CONTÉM: ${rotulo.contem}`);
    if (vis('registro') && rotulo.numeroRegistro) contemReg.push(`REG:${rotulo.numeroRegistro}`);
    if (contemReg.length > 0) lines.push(contemReg.join("   "));
    return stripAccents(lines.join('\n'));
  }

  const aplicacao = getAplicacao();
  const lines: string[] = [];
  if (vis('medico')) { const p = formatarPrescritor(); if (p) lines.push(p); }
  if (vis('paciente') && rotulo.nomePaciente) lines.push(rotulo.nomePaciente.toUpperCase());
  if (vis('requisicao')) lines.push(`REQ:${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`);
  if (mescla && vis('composicao')) {
    lines.push(rotulo.composicao!.toUpperCase());
  } else if (!mescla && vis('formula')) {
    const f = formatarFormula(rotulo.formula);
    if (f) lines.push(f);
  }
  if (vis('lote') || vis('fabricacao') || vis('validade')) {
    const loteInfo: string[] = [];
    if (vis('lote')) { const l = formatarLote(); if (l) loteInfo.push(`L: ${l}`); }
    if (vis('fabricacao') && rotulo.dataFabricacao) loteInfo.push(`F: ${formatarDataCurta(rotulo.dataFabricacao)}`);
    if (vis('validade') && rotulo.dataValidade) loteInfo.push(`V: ${formatarDataCurta(rotulo.dataValidade)}`);
    if (loteInfo.length > 0) lines.push(loteInfo.join('  '));
  }
  if (vis('ph') || vis('aplicacao') || vis('contem')) {
    const infoLine: string[] = [];
    if (vis('ph') && rotulo.ph) infoLine.push(`pH: ${rotulo.ph}`);
    if (vis('aplicacao') && aplicacao) infoLine.push(`APLICAÇÃO: ${aplicacao}`);
    if (vis('contem') && rotulo.contem) infoLine.push(`CONT: ${rotulo.contem}`);
    if (infoLine.length > 0) lines.push(infoLine.join('  '));
  }
  if (vis('tipoUso')) { const t = rotulo.tipoUso?.toUpperCase(); if (t && !/^\d+$/.test(t)) lines.push(t); }
  if (vis('posologia') && rotulo.posologia) lines.push(`POS: ${rotulo.posologia.toUpperCase()}`);
  if (vis('observacoes')) {
    const obs = rotulo.observacoes?.replace(/APLIC(?:AÇÃO|ACAO)?[:\s]+[^\n,;]+[,;\s]*/gi, "").trim();
    if (obs) lines.push(`OBS: ${obs}`);
  }
  if (vis('registro') && rotulo.numeroRegistro) lines.push(`REG: ${rotulo.numeroRegistro}`);
  return stripAccents(lines.join('\n'));
}

// ---- Component ----

const FONT_SIZE_KEY = 'label_editor_font_size';
const LINE_SPACING_KEY = 'label_editor_line_spacing';
const META_INLINE_KEY = 'label_editor_meta_inline';
const getStoredFontSize = (layoutTipo?: string) => {
  try {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    if (stored) return parseInt(stored, 10);
  } catch {}
  if (layoutTipo === 'A_PAC_PEQ') return 5;
  if (layoutTipo === 'A_PAC_GRAN') return 10;
  return 14;
};

const getStoredLineSpacing = (layoutTipo?: string): number => {
  try {
    const stored = localStorage.getItem(LINE_SPACING_KEY);
    if (stored) return parseFloat(stored);
  } catch {}
  return 1.4;
};

const getStoredMetaInline = (layoutTipo?: string): boolean => {
  try {
    const stored = localStorage.getItem(META_INLINE_KEY);
    if (stored) return stored === 'true';
  } catch {}
  return false;
};

const LabelTextEditor = ({
   rotulos, currentIndex, onIndexChange, onTextChange,
   layoutConfig, layoutType, pharmacyConfig, searchedRequisition,
   onPrint, onPrintAll, onPrintFcRaw, isPrinting, availablePrinters, selectedPrinter, onPrinterChange,
   onClose,
 }: LabelTextEditorProps) => {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1, totalLines: 1, totalCols: 1 });
  const [editorFontSize, setEditorFontSize] = useState(() => getStoredFontSize(layoutType));
  const [printQuantity, setPrintQuantity] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(() => getStoredLineSpacing(layoutType));
  const [metaInline, setMetaInline] = useState(() => getStoredMetaInline(layoutType));

  // ---- Dirty state & autosave ----
  type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<Record<string, string>>({});
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const rotulo = rotulos[currentIndex];
  const maxCols = layoutConfig.colunasMax;
  const maxLines = layoutConfig.linhasMax;
  const isAmp10 = layoutType === 'AMP10';

  const amp10Opts = isAmp10 ? { metaInline } : undefined;
  // stripAccents garante que texto salvo no Supabase também não tenha acentos
  const text = stripAccents(rotulo?.textoLivre ?? generateText(rotulo, layoutConfig, layoutType, amp10Opts));

  // Build current texts snapshot for dirty detection
  const currentTextsSnapshot = useMemo(() => {
    const snap: Record<string, string> = {};
    rotulos.forEach(r => {
      if (r.textoLivre !== undefined) snap[r.id] = r.textoLivre;
    });
    return snap;
  }, [rotulos]);

  const isDirty = useMemo(() => {
    const keys = new Set([...Object.keys(currentTextsSnapshot), ...Object.keys(lastSavedSnapshot)]);
    for (const k of keys) {
      if (currentTextsSnapshot[k] !== lastSavedSnapshot[k]) return true;
    }
    return false;
  }, [currentTextsSnapshot, lastSavedSnapshot]);

  // Update save status based on dirty
  useEffect(() => {
    if (isDirty && saveStatus !== 'saving') {
      setSaveStatus('dirty');
    } else if (!isDirty && saveStatus === 'dirty') {
      setSaveStatus('saved');
    }
  }, [isDirty]);

  // ---- Initialize snapshot on load (mark loaded texts as "saved") ----
  const initializedReqRef = useRef<string>('');
  useEffect(() => {
    const reqId = searchedRequisition || '';
    if (reqId && reqId !== initializedReqRef.current && rotulos.length > 0) {
      initializedReqRef.current = reqId;
      const snap: Record<string, string> = {};
      rotulos.forEach(r => {
        if (r.textoLivre !== undefined) snap[r.id] = r.textoLivre;
      });
      setLastSavedSnapshot(snap);
      setSaveStatus('idle');
    }
  }, [searchedRequisition, rotulos.length]);

  // ---- Autosave with debounce ----
  useEffect(() => {
    if (!isDirty) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      performSave(true);
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [currentTextsSnapshot, isDirty]);

  // ---- Page unload protection ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Limpa chaves de localStorage obsoletas (yOffset antigo)
  useEffect(() => {
    localStorage.removeItem('label_editor_y_offset_A_PAC_PEQ');
  }, []);

  // Track previous layout to detect layout switches
  const prevLayoutRef = useRef<LayoutType>(layoutType);

  // Initialize textoLivre on load or layout change
  useEffect(() => {
    if (!rotulo) return;

    const layoutChanged = prevLayoutRef.current !== layoutType;
    prevLayoutRef.current = layoutType;

    const resolvedLayoutTipo = resolveLayoutTipo(layoutConfig, layoutType);
    const isFixedGrid = resolvedLayoutTipo === 'A_PAC_PEQ' || resolvedLayoutTipo === 'A_PAC_GRAN' || resolvedLayoutTipo === 'AMP_CX';

    // Se já tem textoLivre salvo e não houve troca de layout, verificar se precisa regenerar
    if (!layoutChanged && rotulo.textoLivre !== undefined) {
      // Para AMP_CX: detectar formato antigo (fixedLine com gaps enormes) e forçar regeneração
      if (resolvedLayoutTipo === 'AMP_CX' && shouldRegenerateAmpCxText(rotulo.textoLivre)) {
        // Cai para regeneração abaixo
      } else if (resolvedLayoutTipo === 'A_PAC_GRAN' && shouldRegeneratePacGranText(rotulo.textoLivre, rotulo)) {
        // Cai para regeneração abaixo
      } else {
        return;
      }
    }

    let generated = generateText(rotulo, layoutConfig, layoutType, amp10Opts);
    if (maxCols) {
      generated = isFixedGrid
        ? generated.split('\n').map(line => line.substring(0, maxCols)).join('\n')
        : wrapText(generated, maxCols, Number.MAX_SAFE_INTEGER);
    }
    onTextChange(rotulo.id, generated);
  }, [rotulo?.id, rotulo?.textoLivre === undefined, layoutType, metaInline]);

  const updateCursorInfo = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = ta.value;
    const pos = ta.selectionStart;
    const lines = val.split('\n');
    let charCount = 0;
    let currentLine = 1;
    let currentCol = 1;
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= pos) {
        currentLine = i + 1;
        currentCol = pos - charCount + 1;
        break;
      }
      charCount += lines[i].length + 1;
    }
    setCursorInfo({
      line: currentLine,
      col: currentCol,
      totalLines: lines.length,
      totalCols: lines[currentLine - 1]?.length || 0,
    });
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = stripAccents(e.target.value);
    onTextChange(rotulo.id, newText);
    setTimeout(updateCursorInfo, 0);
  };

  const handleCancelar = () => {
    const fresh = generateText(rotulo, layoutConfig, layoutType, amp10Opts);
    onTextChange(rotulo.id, undefined);
    setTimeout(() => onTextChange(rotulo.id, fresh), 0);
  };

  const handleCursorMove = () => {
    updateCursorInfo();
  };

  // ---- Navigation with unsaved changes protection ----
  const guardAction = (action: () => void) => {
    if (isDirty) {
      pendingActionRef.current = action;
      setUnsavedDialogOpen(true);
    } else {
      action();
    }
  };

  const goNext = () => {
    const action = () => { if (currentIndex < rotulos.length - 1) onIndexChange(currentIndex + 1); };
    guardAction(action);
  };
  const goPrev = () => {
    const action = () => { if (currentIndex > 0) onIndexChange(currentIndex - 1); };
    guardAction(action);
  };

  const handleDialogSaveAndContinue = async () => {
    setUnsavedDialogOpen(false);
    await performSave(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleDialogDiscard = () => {
    setUnsavedDialogOpen(false);
    // Reset snapshot to current to clear dirty
    setLastSavedSnapshot({ ...currentTextsSnapshot });
    setSaveStatus('idle');
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleDialogCancel = () => {
    setUnsavedDialogOpen(false);
    pendingActionRef.current = null;
  };

  const dim = layoutConfig.dimensoes || { larguraMM: 109, alturaMM: 25 };

  const handleFontSizeChange = (delta: number) => {
    setEditorFontSize(prev => {
      const next = Math.max(6, Math.min(24, prev + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  const handleLineSpacingChange = (delta: number) => {
    setLineSpacing(prev => {
      const next = Math.max(1.0, Math.min(2.0, Math.round((prev + delta) * 10) / 10));
      localStorage.setItem(LINE_SPACING_KEY, String(next));
      return next;
    });
  };

  const handleMetaInlineToggle = (checked: boolean) => {
    setMetaInline(checked);
    localStorage.setItem(META_INLINE_KEY, String(checked));
  };

  // ---- Core save function ----
  const performSave = async (isAutosave: boolean) => {
    // SEMPRE usar o nrRequisicao do próprio rótulo (canônico) em vez de searchedRequisition
    // Isso evita race condition quando o usuário troca de req antes do autosave disparar
    const nrReq = rotulos[0]?.nrRequisicao?.trim() || searchedRequisition?.trim();

    if (!nrReq || rotulos.length === 0) {
      if (!isAutosave) {
        toast({
          title: "Nada para salvar",
          description: "Busque uma requisição antes de salvar.",
          variant: "destructive",
        });
      }
      return;
    }

    setSaveStatus('saving');

    const { data: { user } } = await supabase.auth.getUser();

    const upserts = rotulos
      .filter(r => r.textoLivre !== undefined)
      .map(r => ({
        nr_requisicao: nrReq,
        item_id: r.id,
        texto_livre: r.textoLivre,
        saved_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }))
      .map(u => ({ ...u, layout_type: layoutType }));

    if (upserts.length === 0) {
      setSaveStatus('idle');
      return;
    }

    const { error } = await supabase
      .from('saved_rotulos')
      .upsert(upserts as any, { onConflict: 'nr_requisicao,item_id,layout_type' });

    if (error) {
      setSaveStatus('error');
      if (!isAutosave) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Update snapshot
      const snap: Record<string, string> = {};
      rotulos.forEach(r => {
        if (r.textoLivre !== undefined) snap[r.id] = r.textoLivre;
      });
      setLastSavedSnapshot(snap);
      setSaveStatus('saved');
      if (!isAutosave) {
        toast({
          title: "Edições salvas",
          description: `${upserts.length} rótulo(s) salvo(s) na nuvem para req ${nrReq}.`,
        });
      }
      // Reset to idle after 3s
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
    }
  };

  const handleSaveAllTexts = () => performSave(false);


  if (!rotulo) return null;

  return (
    <div className="w-full max-w-2xl mx-auto border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">{layoutConfig.nome}</span>
          <span className="text-xs text-muted-foreground ml-3">
            Registro: {currentIndex + 1}/{rotulos.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Font size */}
          <div className="flex items-center gap-1">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFontSizeChange(-1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-6 text-center">{editorFontSize}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFontSizeChange(1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {/* Line spacing */}
          <div className="flex items-center gap-1">
            <AlignVerticalSpaceAround className="h-3.5 w-3.5 text-muted-foreground" />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleLineSpacingChange(-0.1)}>
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-6 text-center">{lineSpacing.toFixed(1)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleLineSpacingChange(0.1)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {/* Meta inline toggle (only for AMP10) */}
          {isAmp10 && (
            <div className="flex items-center gap-1.5">
              <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
              <Switch checked={metaInline} onCheckedChange={handleMetaInlineToggle} className="scale-75" />
              <span className="text-xs text-muted-foreground">{metaInline ? 'Compacto' : 'Separado'}</span>
            </div>
          )}
          {/* Save status + Cancelar / Salvar / Fechar */}
          <div className="flex items-center gap-1.5">
            {/* Save status indicator */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" /> Salvo
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" /> Erro ao salvar
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="h-3 w-3" /> Não salvo
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            title="Descartar edições e restaurar texto original"
            onClick={handleCancelar}
          >
            Cancelar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs ${isDirty ? 'text-primary font-semibold' : 'text-primary/60'} hover:text-primary/80`}
            title="Salvar edições desta requisição"
            onClick={handleSaveAllTexts}
            disabled={saveStatus === 'saving'}
          >
            Salvar
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Fechar editor"
              onClick={() => guardAction(() => onClose())}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative overflow-x-auto">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          onFocus={updateCursorInfo}
          className="w-full bg-background text-foreground font-mono p-4 resize-none focus:outline-none border-none min-h-[200px]"
          style={{
            fontSize: `${editorFontSize}px`,
            lineHeight: String(lineSpacing),
            letterSpacing: '-0.5px',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
          wrap="off"
          spellCheck={false}
          rows={Math.max(8, text.split('\n').length + 2)}
        />
      </div>

      {/* Cursor info bar */}
      <div className="bg-muted/30 border-t border-border px-4 py-1 text-xs text-muted-foreground font-mono flex items-center justify-between">
        <span>Lin: {cursorInfo.line}{maxLines ? `/${maxLines}` : `/${cursorInfo.totalLines}`}  Col: {cursorInfo.col}{maxCols ? `/${maxCols}` : `/${cursorInfo.totalCols}`}</span>
      </div>

      {/* Navigation */}
      <div className="bg-muted/50 border-t border-border px-4 py-2 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          Req: {searchedRequisition} - {rotulo.nrItem || currentIndex}
        </span>
        <Button variant="outline" size="sm" onClick={goNext} disabled={currentIndex === rotulos.length - 1}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Layout info + Print */}
      <div className="bg-muted/30 border-t border-border px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{layoutType}</span>
          <span className="mx-1">|</span>
          <span>{dim.larguraMM}x{dim.alturaMM}mm</span>
          <span className="mx-1">|</span>
          <span>{layoutConfig.linhasMax ?? layoutConfig.linhas.length} linhas</span>
        </div>
        <div className="flex items-center gap-2">
          {availablePrinters.length > 0 && (
            <Select value={selectedPrinter} onValueChange={onPrinterChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <Printer className="h-3.5 w-3.5 mr-1 shrink-0" />
                <SelectValue placeholder="Impressora" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {availablePrinters.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1 border border-border rounded-md px-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPrintQuantity(q => Math.max(1, q - 1))}>
              <Minus className="h-3 w-3" />
            </Button>
            <input
              type="number"
              min={1}
              max={50}
              value={printQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setPrintQuantity(Math.max(1, Math.min(50, val)));
                else if (e.target.value === '') setPrintQuantity(1);
              }}
              className="w-10 text-center text-sm font-mono bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPrintQuantity(q => Math.min(50, q + 1))}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button size="sm" onClick={() => onPrint(printQuantity)} disabled={isPrinting} className="bg-secondary hover:bg-secondary/90">
            <Printer className={`h-4 w-4 mr-1 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Imprimindo...' : `Barra ${(rotulo.nrItem || currentIndex)}${printQuantity > 1 ? ` (x${printQuantity})` : ''}`}
          </Button>
          {rotulos.length > 1 && (
            <Button size="sm" variant="outline" onClick={() => onPrintAll(printQuantity)} disabled={isPrinting}>
              <Printer className={`h-4 w-4 mr-1 ${isPrinting ? 'animate-pulse' : ''}`} />
              Todas ({rotulos.length * printQuantity})
            </Button>
          )}
          {onPrintFcRaw && (
            <Button size="sm" variant="default" onClick={onPrintFcRaw} disabled={isPrinting} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              <Zap className="h-4 w-4" />
              FC RAW
            </Button>
          )}
        </div>
      </div>
      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onSaveAndContinue={handleDialogSaveAndContinue}
        onDiscardAndContinue={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    </div>
  );
};

export default LabelTextEditor;
