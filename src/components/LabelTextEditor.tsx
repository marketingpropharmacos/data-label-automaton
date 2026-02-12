import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
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
  onPrint: () => void;
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

const formatarFormula = (formula: string) => {
  if (!formula) return "";
  let nome = formula;
  if (nome.toUpperCase().startsWith("AMP ")) nome = nome.substring(4);
  return nome.toUpperCase();
};

const formatarNomeComponente = (nome: string): string => {
  if (!nome) return "";
  let limpo = nome.trim().toUpperCase();
  const prefixos = ["AMP ", "FRS ", "FR ", "BIS ", "ENV "];
  for (const p of prefixos) {
    if (limpo.startsWith(p)) { limpo = limpo.substring(p.length); break; }
  }
  return limpo;
};

const isValidComposicao = (texto: string): boolean => {
  if (!texto?.trim()) return false;
  return !/^[\d.,;\s]+$/.test(texto.trim());
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
  const maxCols = layoutConfig.colunasMax || 27;
  const maxLines = layoutConfig.linhasMax || 7;

  const formatarPrescritorPeq = () => {
    if (!rotulo.numeroCRM) return { name: "", conselho: "" };
    const codigo = (rotulo.prefixoCRM || '1').toUpperCase().trim();
    const tipo = tiposPrescritores[codigo] || { conselho: 'CRM' };
    const conselho = tipo.conselho;
    const name = rotulo.nomeMedico ? `DR(A)${rotulo.nomeMedico.toUpperCase()}` : "";
    const conselhoStr = conselho ? `${conselho}-${rotulo.ufCRM}-${rotulo.numeroCRM}` : "";
    return { name, conselho: conselhoStr };
  };

  const lines: string[] = [];

  // Line 1: PACIENTE + REQ right-aligned
  const paciente = (rotulo.nomePaciente || "").toUpperCase();
  const req = `REQ:${rotulo.nrRequisicao}-${rotulo.nrItem || '0'}`;
  lines.push(padLine(paciente, req, maxCols));

  // Line 2: DR(A)MEDICO + CONSELHO right-aligned
  const { name: drName, conselho } = formatarPrescritorPeq();
  lines.push(padLine(drName, conselho, maxCols));

  // Line 3: REG right-aligned
  const reg = rotulo.numeroRegistro ? `REG:${rotulo.numeroRegistro}` : "";
  lines.push(padLine("", reg, maxCols));

  // Lines 4-7: empty (user can edit freely)
  while (lines.length < maxLines) {
    lines.push("");
  }

  return lines.slice(0, maxLines).join('\n');
}

function generateText(rotulo: RotuloItem, layoutConfig: LayoutConfig): string {
  // Route to specific generator for A_PAC_PEQ
  if (layoutConfig.tipo === 'A_PAC_PEQ') {
    return generateTextPacPeq(rotulo, layoutConfig);
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
    return lines.join('\n');
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
  return lines.join('\n');
}

// ---- Component ----

const LabelTextEditor = ({
  rotulos, currentIndex, onIndexChange, onTextChange,
  layoutConfig, layoutType, pharmacyConfig, searchedRequisition,
  onPrint, isPrinting, availablePrinters, selectedPrinter, onPrinterChange,
}: LabelTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1, totalLines: 1, totalCols: 1 });

  const rotulo = rotulos[currentIndex];
  const maxCols = layoutConfig.colunasMax;
  const maxLines = layoutConfig.linhasMax;

  const text = rotulo?.textoLivre ?? generateText(rotulo, layoutConfig);

  // Initialize textoLivre on load or layout change
  useEffect(() => {
    if (rotulo) {
      let generated = generateText(rotulo, layoutConfig);
      if (maxCols && maxLines) {
        generated = layoutConfig.tipo === 'A_PAC_PEQ'
          ? truncateText(generated, maxCols, maxLines)
          : wrapText(generated, maxCols, maxLines);
      }
      onTextChange(rotulo.id, generated);
    }
  }, [rotulo?.id, layoutConfig.tipo]);

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
      newText = layoutConfig.tipo === 'A_PAC_PEQ'
        ? truncateText(newText, maxCols, maxLines)
        : wrapText(newText, maxCols, maxLines);
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
          className="w-full bg-background text-foreground font-mono text-sm p-4 resize-none focus:outline-none border-none min-h-[200px]"
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
          <Button size="sm" onClick={onPrint} disabled={isPrinting} className="bg-secondary hover:bg-secondary/90">
            <Printer className={`h-4 w-4 mr-1 ${isPrinting ? 'animate-pulse' : ''}`} />
            {isPrinting ? 'Imprimindo...' : 'Imprimir'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LabelTextEditor;
