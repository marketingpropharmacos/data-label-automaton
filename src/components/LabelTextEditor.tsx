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

// ---- Abbreviate name to fit maxLen: keeps first+last, abbreviates middle names ----
function abbreviateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length <= 1) return name.substring(0, maxLen);

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1);

  const attempts = [
    // 1. First + middle initials (spaced) + Last: "KAROLINY A. VIEIRA"
    [first, ...middle.map(p => p[0] + '.'), last].join(' '),
    // 2. First + middle initials (compact) + Last: "KAROLINY A.VIEIRA"
    first + (middle.length ? ' ' + middle.map(p => p[0] + '.').join('') : '') + last,
    // 3. First initial + middle initials + Last: "K. A. VIEIRA"
    [first[0] + '.', ...middle.map(p => p[0] + '.'), last].join(' '),
    // 4. First initial + Last: "K. VIEIRA"
    `${first[0]}. ${last}`,
    // 5. Last name only
    last.substring(0, maxLen),
  ];

  for (const attempt of attempts) {
    if (attempt.length <= maxLen) return attempt;
  }
  return name.substring(0, maxLen);
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
  const maxCols = layoutConfig.colunasMax || 28;

  // Line 1: PACIENTE + REQ na mesma linha (mesmo Y no PPLA: Y=188)
  const reqNum = `${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`.substring(0, 7);
  const req = `REQ:${reqNum}`;
  const pacienteMax = maxCols - req.length - 1;
  const paciente = abbreviateName((rotulo.nomePaciente || "").toUpperCase(), pacienteMax);
  const line1 = padLine(paciente, req, maxCols);

  // Line 2: DR(A)MEDICO + CRM na mesma linha (mesmo Y no PPLA: Y=163)
  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoNome = tipo.conselho || 'CRM';
  const conselhoStr = rotulo.numeroCRM
    ? `${conselhoNome}-${rotulo.ufCRM || '??'}-${rotulo.numeroCRM}`.substring(0, 15)
    : "";
  const medicoMax = conselhoStr ? maxCols - 5 - conselhoStr.length - 1 : maxCols - 5;
  const medico = rotulo.nomeMedico ? abbreviateName(rotulo.nomeMedico.toUpperCase(), Math.max(0, medicoMax)) : "";
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

  // === Zone widths (right fields get fixed reservation) ===
  const REQ_WIDTH = 18;          // "REQ:000000-0" = ~13, reserve 18
  const CONSELHO_WIDTH = 20;     // "CRM.SP-123456" = ~14, reserve 20
  const APLICACAO_WIDTH = 25;    // "APLICAÇAO:MICROAGULHAMENTO" reserve
  const REG_WIDTH = 20;          // "REG:123456" reserve

  const LEFT_L1 = W - REQ_WIDTH;       // paciente max
  const LEFT_L2 = W - CONSELHO_WIDTH;  // dr(a)+medico max
  const LEFT_L6 = W - APLICACAO_WIDTH; // uso max
  const LEFT_L7 = W - REG_WIDTH;       // contem max

  // === Helper: anchor left + right within fixed width ===
  const fixedLine = (left: string, right: string, leftMax: number, rightMax: number): string => {
    const l = (left || "").substring(0, leftMax);
    const r = (right || "").substring(0, rightMax);
    const gap = W - l.length - r.length;
    if (gap <= 0) return (l + r).substring(0, W);
    return l + ' '.repeat(gap) + r;
  };

  // === Helper: fixed 4-column meta line (pH / lote / fab / val) ===
  const fixedMetaLine = (ph: string, lote: string, fab: string, val: string): string => {
    // 4 zones of equal width
    const zoneW = Math.floor(W / 4);
    const zones = [ph, lote, fab, val];
    return zones.map(z => (z || "").substring(0, zoneW).padEnd(zoneW)).join("").substring(0, W);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;
  const conselhoStr = formatConselhoFC(rotulo.prefixoCRM, rotulo.ufCRM, rotulo.numeroCRM);

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;

  const lines: string[] = [];

  // ── LINE 1: Paciente (left) | REQ (right) ──
  lines.push(fixedLine(cleanName, reqStr, LEFT_L1, REQ_WIDTH));

  // ── LINE 2: DR(A)+Medico (left) | Conselho (right) ──
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(fixedLine(drName, conselhoStr, LEFT_L2, CONSELHO_WIDTH));

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
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const usoText = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `APLICACAO:${aplicacao}` : "";
  lines.push(fixedLine(usoText, aplicacaoStr, LEFT_L6, APLICACAO_WIDTH));

  // ── LINE 7: Contém (left) | REG (right) ──
  const contemStr = rotulo.contem?.trim() ? `CONTEM:${rotulo.contem.trim().toUpperCase()}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(fixedLine(contemStr, regStr, LEFT_L7, REG_WIDTH));

  return lines.join('\n');
}

// ---- A_PAC_GRAN specific generator — FIXED POSITION FIELD MAP ----
// 57 cols, 8 lines. Same anchored-zone pattern as AMP_CX.
function generateTextPacGran(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const W = layoutConfig.colunasMax || 57;

  // === Zone widths ===
  const REQ_WIDTH = 15;        // "REQ:000000-0"
  // Conselho + REG na mesma linha: "CRM-SP-123456 REG:12345"
  const RIGHT_L2_WIDTH = 26;

  const LEFT_L1 = W - REQ_WIDTH;
  const LEFT_L2 = W - RIGHT_L2_WIDTH;

  const fixedLine = (left: string, right: string, leftMax: number, rightMax: number): string => {
    const l = (left || "").substring(0, leftMax);
    const r = (right || "").substring(0, rightMax);
    const gap = W - l.length - r.length;
    if (gap <= 0) return (l + r).substring(0, W);
    return l + ' '.repeat(gap) + r;
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

  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const medicoMax = LEFT_L2 - 5; // 5 = "DR(A)" prefix
  const medicoAbrev = medico ? abbreviateName(medico, medicoMax) : "";
  const drName = medicoAbrev ? `DR(A)${medicoAbrev}` : "";

  const regNum = String(rotulo.numeroRegistro || "");
  const regStr = regNum ? `REG:${regNum}` : "";

  // Combinar conselho + REG na zona direita da L2
  const rightL2 = [conselhoStr, regStr].filter(Boolean).join(' ');

  const lines: string[] = [];

  // L1: Paciente (left) | REQ (right)
  lines.push(fixedLine(cleanName, reqStr, LEFT_L1, REQ_WIDTH));

  // L2: DR(A)+Medico (left) | Conselho + REG (right)
  lines.push(fixedLine(drName, rightL2, LEFT_L2, RIGHT_L2_WIDTH));

  return lines.join('\n');
}

// ---- AMP10 specific generator — FIXED POSITION FIELD MAP ----
// 65 cols, 10 lines. Anchored zones for predictable positioning.
function generateTextAmp10(rotulo: RotuloItem, layoutConfig: LayoutConfig, options?: { metaInline?: boolean }): string {
  const W = layoutConfig.colunasMax || 65;

  // === Zone widths ===
  const REQ_WIDTH = 18;
  const CONSELHO_WIDTH = 20;
  const APLICACAO_WIDTH = 25;
  const REG_WIDTH = 18;

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

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;
  const lines: string[] = [];

  // ── LINE 1: Paciente (left) | REQ (right) ──
  lines.push(fixedLine(cleanName, reqStr, LEFT_L1, REQ_WIDTH));

  // ── LINE 2: DR(A)+Medico (left) | Conselho (right) ──
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase() : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(fixedLine(drName, conselhoStr, LEFT_L2, CONSELHO_WIDTH));

  // ── LINES 3-5: Produto (left-anchored, up to 3 lines, word-wrap) ──
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
      const metaStr = meta.join("  ");
      if (options?.metaInline && metaStr) {
        const maxNome = W - metaStr.length - 2;
        lines.push(`${nomeExibicao.substring(0, maxNome)}  ${metaStr}`.substring(0, W));
      } else {
        lines.push(nomeExibicao.substring(0, W));
        if (metaStr) lines.push(metaStr.substring(0, W));
      }
    });
  } else {
    const mescla = isValidComposicao(rotulo.composicao || "");
    if (mescla) {
      wrapText(rotulo.composicao!.toUpperCase(), W, 3).split('\n').forEach(l => lines.push(l));
    } else {
      const f = formatarFormula(rotulo.formula);
      if (f) lines.push(f.substring(0, W));
    }
  }

  // ── LINE 6: pH | Lote | Fabricação | Validade (fixed 4-zone) ──
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

  // ── LINE 7: Uso (left) | Aplicação (right) ──
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const usoText = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `APLICACAO:${aplicacao}` : "";
  lines.push(fixedLine(usoText, aplicacaoStr, LEFT_USO, APLICACAO_WIDTH));

  // ── LINE 8: Contém (left) | REG (right) ──
  const contemStr = rotulo.contem?.trim() ? `CONTEM:${rotulo.contem.trim().toUpperCase()}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(fixedLine(contemStr, regStr, LEFT_CONTEM, REG_WIDTH));

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
  if ((layoutConfig.colunasMax === 28 || layoutConfig.colunasMax === 38) && layoutConfig.linhasMax === 8) return 'A_PAC_PEQ';
  if (layoutConfig.colunasMax === 57 && (layoutConfig.linhasMax === 5 || layoutConfig.linhasMax === 8)) return 'A_PAC_GRAN';

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
  const text = rotulo?.textoLivre ?? generateText(rotulo, layoutConfig, layoutType, amp10Opts);

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

    if (!layoutChanged && rotulo.textoLivre !== undefined) return;

    const resolvedLayoutTipo = resolveLayoutTipo(layoutConfig, layoutType);
    const isFixedGrid = resolvedLayoutTipo === 'A_PAC_PEQ' || resolvedLayoutTipo === 'A_PAC_GRAN' || resolvedLayoutTipo === 'AMP_CX';

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
    const newText = e.target.value;
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
    const nrReq = searchedRequisition?.trim() || rotulos[0]?.nrRequisicao?.trim();

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
      }));

    if (upserts.length === 0) {
      setSaveStatus('idle');
      return;
    }

    const { error } = await supabase
      .from('saved_rotulos')
      .upsert(upserts, { onConflict: 'nr_requisicao,item_id' });

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
            <span className="text-sm font-mono w-6 text-center">{printQuantity}</span>
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
