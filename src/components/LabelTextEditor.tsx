import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Printer, Minus, Plus, Type, Zap, AlignVerticalSpaceAround, Rows3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotuloItem, PharmacyConfig, LayoutConfig, LayoutType } from "@/types/requisicao";

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
  onTextChange: (id: string, text: string) => void;
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

// ---- A_PAC_PEQ specific generator (fixed grid) ----
function generateTextPacPeq(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const maxCols = layoutConfig.colunasMax || 38;
  const maxLines = layoutConfig.linhasMax || 8;

  // Line 1: PACIENTE (25 chars) + REQ:RRRRRRR (7 chars)
  const paciente = (rotulo.nomePaciente || "").toUpperCase().substring(0, 25);
  const reqNum = `${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`.substring(0, 7);
  const req = `REQ:${reqNum}`;
  const line1 = padLine(paciente, req, maxCols);

  // Line 2: DR(A)MEDICO (16 chars) + CONSELHO (15 chars)
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, 16) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoNome = tipo.conselho || 'CRM';
  const conselhoStr = rotulo.numeroCRM
    ? `${conselhoNome}-${rotulo.ufCRM || '??'}-${rotulo.numeroCRM}`.substring(0, 15)
    : "";
  const line2 = padLine(drName, conselhoStr, maxCols);

  // Line 3: REG:GGGGGGGG right-aligned
  const regNum = String(rotulo.numeroRegistro || "");
  const reg = regNum ? `REG:${regNum}` : "";
  const line3 = reg ? padLine("", reg, maxCols) : "";

  const lines = [line1, line2];
  if (line3) lines.push(line3);
  return lines.join('\n');
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

// ---- AMP_CX specific generator (109x25mm, 73 cols x 8 lines) ----
function generateTextAmpCx(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const maxCols = layoutConfig.colunasMax || 73;
  const maxLines = layoutConfig.linhasMax || 8;

  // Junta blocos com espaçamento compacto (1 espaço), conforme referência visual
  const compactLine = (left: string, right: string): string => {
    const safeLeft = (left || "").trim();
    const safeRight = (right || "").trim();
    if (safeLeft && safeRight) return `${safeLeft} ${safeRight}`.substring(0, maxCols);
    return (safeLeft || safeRight).substring(0, maxCols);
  };

  const conselhoStr = formatConselhoFC(rotulo.prefixoCRM, rotulo.ufCRM, rotulo.numeroCRM);
  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;

  if (isKit && rotulo.componentes) {
    const lines: string[] = [];

    // Line 1: PACIENTE + REQ (compacto)
    lines.push(compactLine(cleanName, reqStr));

    // Line 2: DR(A)MEDICO + CONSELHO (compacto)
    const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, maxCols - 10) : "";
    const drName = medico ? `DR(A)${medico}` : "";
    lines.push(compactLine(drName, conselhoStr));

    // Component lines: NOME PH:X L:X F:XX/XX V:XX/XX (tudo na mesma linha)
    // Filtrar componentes de embalagem (BLISTER, CAIXA MED, etc.)
    const componentesVisiveis = rotulo.componentes.filter(
      (comp) => {
        const nome = comp.nome?.toUpperCase() || '';
        return !nome.startsWith('BLISTER') && !nome.startsWith('CAIXA MED');
      }
    );
    componentesVisiveis.forEach((comp) => {
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
      const maxNome = metaStr ? maxCols - metaStr.length - 1 : maxCols;
      const lineText = metaStr ? `${nomeExibicao.substring(0, maxNome)} ${metaStr}` : nomeExibicao;
      lines.push(lineText.substring(0, maxCols));
    });

    // Usage (Posologia) + Application
    const posologia = rotulo.posologia?.toUpperCase() || "";
    const posologiaValida = /^\d+$/.test(posologia) ? "" : posologia;
    const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
    {
      const right = aplicacao ? `APLICAÇÃO:${aplicacao}` : "";
      lines.push(compactLine(posologiaValida, right));
    }

    // Contains + REG (CONTEM sempre visível para preenchimento manual)
    const contemStr = rotulo.contem?.trim() ? `CONTEM: ${rotulo.contem}` : "CONTEM:";
    const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
    lines.push(compactLine(contemStr, regStr));

    // Não cortar linhas — Uso/Aplicação e Contem/REG devem sempre aparecer
    return lines.join('\n');
  }

  // NON-KIT mode (Mescla or Item Único)
  const lines: string[] = [];

  // Line 1: PACIENTE + REQ (compacto)
  lines.push(compactLine(cleanName, reqStr));

  // Line 2: DR(A)MEDICO + CONSELHO (compacto)
  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, maxCols - 10) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(compactLine(drName, conselhoStr));

  // Line 3: Composição/Fórmula (1 linha apenas para não empurrar campos)
  const mescla = isValidComposicao(rotulo.composicao || "");
  if (mescla) {
    const compText = rotulo.composicao!.toUpperCase();
    lines.push(compText.substring(0, maxCols));
  } else {
    const f = formatarFormula(rotulo.formula);
    if (f) lines.push(f.substring(0, maxCols));
  }

  // Line: PH + Lote + Fabricação + Validade (PH sempre visível para preenchimento manual)
  const metaParts: string[] = [];
  const phVal = rotulo.ph ? String(rotulo.ph).replace('.', ',') : '';
  metaParts.push(`PH:${phVal}`);
  const lote = rotulo.lote || "";
  if (lote) {
    if (lote.includes('/')) {
      metaParts.push(`L:${lote}`);
    } else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      metaParts.push(`L:${lote}${ano ? '/' + ano : ''}`);
    }
  }
  if (rotulo.dataFabricacao) metaParts.push(`F:${formatarDataCurta(rotulo.dataFabricacao)}`);
  if (rotulo.dataValidade) metaParts.push(`V:${formatarDataCurta(rotulo.dataValidade)}`);
  if (metaParts.length > 0) lines.push(metaParts.join(" ").substring(0, maxCols));

  // Line: Posologia + Aplicação (compacto)
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const posologiaValida = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  {
    const right = aplicacao ? `APLICAÇÃO:${aplicacao}` : "";
    lines.push(compactLine(posologiaValida, right));
  }

  // Line: Contém + REG
  const contemStr = rotulo.contem?.trim() ? `CONTEM: ${rotulo.contem}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(compactLine(contemStr, regStr));

    return lines.join('\n');
}

// ---- A_PAC_GRAN specific generator (fixed grid, same header as PEQ) ----
function generateTextPacGran(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const maxCols = layoutConfig.colunasMax || 57;
  const maxLines = layoutConfig.linhasMax || 8;

  const paciente = (rotulo.nomePaciente || "").toUpperCase().substring(0, 35);
  const reqNum = `${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`.substring(0, 10);
  const req = `REQ:${reqNum}`;
  const line1 = padLine(paciente, req, maxCols);

  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, 25) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoNome = tipo.conselho || 'CRM';
  const conselhoStr = rotulo.numeroCRM
    ? `${conselhoNome}-${rotulo.ufCRM || '??'}-${rotulo.numeroCRM}`.substring(0, 20)
    : "";
  const line2 = padLine(drName, conselhoStr, maxCols);

  const regNum = String(rotulo.numeroRegistro || "");
  const reg = regNum ? `REG:${regNum}` : "";
  const line3 = reg ? padLine("", reg, maxCols) : "";

  const lines = [line1, line2];
  if (line3) lines.push(line3);
  return lines.join('\n');
}

// ---- AMP10 specific generator (89x38mm, 65 cols x 10 lines) ----
function generateTextAmp10(rotulo: RotuloItem, layoutConfig: LayoutConfig, options?: { metaInline?: boolean }): string {
  const maxCols = layoutConfig.colunasMax || 65;
  const maxLines = layoutConfig.linhasMax || 10;

  const compactLine = (left: string, right: string): string => {
    const safeLeft = (left || "").trim();
    const safeRight = (right || "").trim();
    if (safeLeft && safeRight) return `${safeLeft} ${safeRight}`.substring(0, maxCols);
    return (safeLeft || safeRight).substring(0, maxCols);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoStr = tipo.conselho
    ? `${tipo.conselho}-${rotulo.ufCRM}-${rotulo.numeroCRM}`
    : "";

  const isKit = rotulo.tipoItem === 'KIT' && rotulo.componentes && rotulo.componentes.length > 0;
  const lines: string[] = [];

  lines.push(compactLine(cleanName, reqStr));

  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, maxCols - 10) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(compactLine(drName, conselhoStr));

  if (isKit && rotulo.componentes) {
    // Filtrar componentes de embalagem (BLISTER, CAIXA MED, etc.)
    const componentesVisiveis = rotulo.componentes.filter(
      (comp) => {
        const nome = comp.nome?.toUpperCase() || '';
        const nomeLimpo = formatarNomeComponente(comp.nome);
        return !nome.startsWith('BLISTER') && !nome.startsWith('CAIXA MED') &&
               !nomeLimpo.startsWith('BLISTER') && !nomeLimpo.startsWith('CAIXA MED');
      }
    );
    componentesVisiveis.forEach((comp) => {
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
        // Tudo na mesma linha: NOME  pH:X  L:X  F:X  V:X
        const maxNome = maxCols - metaStr.length - 2;
        lines.push(`${nomeExibicao.substring(0, maxNome)}  ${metaStr}`.substring(0, maxCols));
      } else {
        lines.push(nomeExibicao.substring(0, maxCols));
        if (metaStr) lines.push(metaStr.substring(0, maxCols));
      }
    });
  } else {
    const mescla = isValidComposicao(rotulo.composicao || "");
    if (mescla) {
      const compText = rotulo.composicao!.toUpperCase();
      wrapText(compText, maxCols, 3).split('\n').forEach(l => lines.push(l));
    } else {
      const f = formatarFormula(rotulo.formula);
      if (f) lines.push(f.substring(0, maxCols));
    }
  }

  // Linha meta: PH, L, F, V (PH sempre visível para preenchimento manual)
  const metaParts: string[] = [];
  const phValAmp10 = rotulo.ph ? String(rotulo.ph).replace('.', ',') : '';
  metaParts.push(`PH:${phValAmp10}`);
  if (rotulo.lote) {
    const lote = rotulo.lote;
    if (lote.includes('/')) { metaParts.push(`L:${lote}`); }
    else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      metaParts.push(`L:${lote}${ano ? '/' + ano : ''}`);
    }
  }
  if (rotulo.dataFabricacao) metaParts.push(`F:${formatarDataCurta(rotulo.dataFabricacao)}`);
  if (rotulo.dataValidade) metaParts.push(`V:${formatarDataCurta(rotulo.dataValidade)}`);
  if (metaParts.length > 0) lines.push(metaParts.join("  ").substring(0, maxCols));

  // Linha uso: posologia + aplicação
  const posologia = rotulo.posologia?.toUpperCase() || "";
  const posologiaValida = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  const aplicacaoStr = aplicacao ? `APLICACAO:${aplicacao}` : "";
  lines.push(compactLine(posologiaValida, aplicacaoStr));

  // Linha contém
  const contem = rotulo.contem?.trim().toUpperCase() || "";
  if (contem) lines.push(`CONTEM: ${contem}`.substring(0, maxCols));

  // Linha REG (final)
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  if (regStr) lines.push(regStr);

  return lines.join('\n');
}

// ---- TIRZ specific generator (109x25mm, 73 cols x 8 lines) ----
function generateTextTirz(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  const maxCols = layoutConfig.colunasMax || 73;
  const maxLines = layoutConfig.linhasMax || 8;

  const compactLine = (left: string, right: string): string => {
    const safeLeft = (left || "").trim();
    const safeRight = (right || "").trim();
    if (safeLeft && safeRight) return `${safeLeft} ${safeRight}`.substring(0, maxCols);
    return (safeLeft || safeRight).substring(0, maxCols);
  };

  const cleanName = cleanPatientName(rotulo.nomePaciente || "").toUpperCase();
  const reqPadded = padReqNumber(rotulo.nrRequisicao);
  const reqStr = `REQ:${reqPadded}-${rotulo.nrItem || '0'}`;

  const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
  const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
  const conselhoStr = tipo.conselho
    ? `${tipo.conselho}-${rotulo.ufCRM}-${rotulo.numeroCRM}`
    : "";

  const lines: string[] = [];

  lines.push(compactLine(cleanName, reqStr));

  const medico = rotulo.nomeMedico ? rotulo.nomeMedico.toUpperCase().substring(0, maxCols - 10) : "";
  const drName = medico ? `DR(A)${medico}` : "";
  lines.push(compactLine(drName, conselhoStr));

  const f = formatarFormula(rotulo.formula);
  if (f) lines.push(f.substring(0, maxCols));

  // PH sempre visível para preenchimento manual
  const metaParts: string[] = [];
  const phValTirz = rotulo.ph ? String(rotulo.ph).replace('.', ',') : '';
  metaParts.push(`PH:${phValTirz}`);
  if (rotulo.lote) {
    const lote = rotulo.lote;
    if (lote.includes('/')) { metaParts.push(`L:${lote}`); }
    else {
      const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
      metaParts.push(`L:${lote}${ano ? '/' + ano : ''}`);
    }
  }
  if (rotulo.dataFabricacao) metaParts.push(`F:${formatarDataCurta(rotulo.dataFabricacao)}`);
  if (rotulo.dataValidade) metaParts.push(`V:${formatarDataCurta(rotulo.dataValidade)}`);
  if (metaParts.length > 0) lines.push(metaParts.join(" ").substring(0, maxCols));

  const posologia = rotulo.posologia?.toUpperCase() || "";
  const posologiaValida = /^\d+$/.test(posologia) ? "" : posologia;
  const aplicacao = rotulo.aplicacao?.trim().toUpperCase() || "";
  if (posologiaValida || aplicacao) {
    const right = aplicacao ? `APLICAÇÃO:${aplicacao}` : "";
    lines.push(compactLine(posologiaValida, right));
  }

  const contemStr = rotulo.contem?.trim() ? `CONTEM: ${rotulo.contem}` : "CONTEM:";
  const regStr = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(compactLine(contemStr, regStr));

  return lines.join('\n');
}

function resolveLayoutTipo(layoutConfig: LayoutConfig, layoutType?: LayoutType): LayoutType {
  if (layoutType) return layoutType;

  const rawTipo = (layoutConfig.tipo || "").toString().trim().toUpperCase().replace(/\./g, "_");
  if (rawTipo === 'A_PAC_PEQ' || rawTipo === 'A_PAC_GRAN' || rawTipo === 'AMP_CX' || rawTipo === 'AMP10' || rawTipo === 'TIRZ') {
    return rawTipo as LayoutType;
  }

  // Fallback por limites físicos do layout (evita quebrar quando tipo vem legado)
  if (layoutConfig.colunasMax === 38 && layoutConfig.linhasMax === 8) return 'A_PAC_PEQ';
  if (layoutConfig.colunasMax === 57 && layoutConfig.linhasMax === 8) return 'A_PAC_GRAN';

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
  return 14;
};

const getStoredLineSpacing = (): number => {
  try {
    const stored = localStorage.getItem(LINE_SPACING_KEY);
    if (stored) return parseFloat(stored);
  } catch {}
  return 1.4;
};

const getStoredMetaInline = (): boolean => {
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
 }: LabelTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1, totalLines: 1, totalCols: 1 });
  const [editorFontSize, setEditorFontSize] = useState(() => getStoredFontSize(layoutType));
  const [printQuantity, setPrintQuantity] = useState(1);
  const [lineSpacing, setLineSpacing] = useState(getStoredLineSpacing);
  const [metaInline, setMetaInline] = useState(getStoredMetaInline);

  const rotulo = rotulos[currentIndex];
  const maxCols = layoutConfig.colunasMax;
  const maxLines = layoutConfig.linhasMax;
  const isAmp10 = layoutType === 'AMP10';

  const amp10Opts = isAmp10 ? { metaInline } : undefined;
  const text = rotulo?.textoLivre ?? generateText(rotulo, layoutConfig, layoutType, amp10Opts);

  // Initialize textoLivre on load or layout change
  useEffect(() => {
    if (rotulo) {
      const resolvedLayoutTipo = resolveLayoutTipo(layoutConfig, layoutType);
      const isFixedGrid = resolvedLayoutTipo === 'A_PAC_PEQ' || resolvedLayoutTipo === 'A_PAC_GRAN' || resolvedLayoutTipo === 'AMP_CX';

      let generated = generateText(rotulo, layoutConfig, layoutType, amp10Opts);
      if (maxCols) {
        generated = isFixedGrid
          ? generated.split('\n').map(line => line.substring(0, maxCols)).join('\n')
          : wrapText(generated, maxCols, Number.MAX_SAFE_INTEGER);
      }
      onTextChange(rotulo.id, generated);
    }
  }, [rotulo?.id, layoutType, metaInline]);

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
      charCount += lines[i].length + 1; // +1 for \n
    }
    setCursorInfo({
      line: currentLine,
      col: currentCol,
      totalLines: lines.length,
      totalCols: lines[currentLine - 1]?.length || 0,
    });
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newText = e.target.value;
    if (maxCols && maxLines) {
      const resolvedLayoutTipo = resolveLayoutTipo(layoutConfig, layoutType);
      const isFixedGrid = resolvedLayoutTipo === 'A_PAC_PEQ' || resolvedLayoutTipo === 'AMP_CX';
      const isFreeScroll = resolvedLayoutTipo === 'A_PAC_GRAN';
      if (isFreeScroll) {
        // A_PAC_GRAN: sem limite de coluna durante edição — texto flui livremente na linha
        const lines = newText.split('\n').slice(0, maxLines);
        newText = lines.join('\n');
      } else {
        newText = isFixedGrid
          ? truncateText(newText, maxCols, maxLines)
          : wrapText(newText, maxCols, maxLines);
      }
    }
    onTextChange(rotulo.id, newText);
    setTimeout(updateCursorInfo, 0);
  };

  const handleCursorMove = () => {
    updateCursorInfo();
  };

  const goNext = () => { if (currentIndex < rotulos.length - 1) onIndexChange(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) onIndexChange(currentIndex - 1); };

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
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          onFocus={updateCursorInfo}
          className="w-full bg-background text-foreground font-mono p-4 resize-none focus:outline-none border-none min-h-[200px]"
          style={{ fontSize: `${editorFontSize}px`, lineHeight: String(lineSpacing), letterSpacing: '-0.5px' }}
          spellCheck={false}
          rows={Math.max(8, text.split('\n').length + 2)}
        />
      </div>

      {/* Cursor info bar */}
      <div className="bg-muted/30 border-t border-border px-4 py-1 text-xs text-muted-foreground font-mono">
        Lin: {cursorInfo.line}{maxLines ? `/${maxLines}` : `/${cursorInfo.totalLines}`}  Col: {cursorInfo.col}{maxCols ? `/${maxCols}` : `/${cursorInfo.totalCols}`}
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
          <span>{layoutConfig.linhas.length} linhas</span>
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
    </div>
  );
};

export default LabelTextEditor;
