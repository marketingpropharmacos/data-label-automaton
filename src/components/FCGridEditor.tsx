/**
 * Editor de Grid estilo Fórmula Certa
 * 
 * Mostra a grade de caracteres com placeholders coloridos (@P, @R, @X, etc.)
 * Permite edição visual do template do rótulo.
 * Baseado na tela "Configuração de Rótulos de Receita - Texto" do FC 6.0.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Save, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LayoutType, RotuloItem } from "@/types/requisicao";
import {
  FIELD_CODES,
  LAYOUT_INFO,
  parseTemplateLine,
  getTemplate,
  saveTemplate,
  resetTemplate,
  fillTemplate,
} from "@/config/templates";

interface FCGridEditorProps {
  layoutType: LayoutType;
  previewData?: RotuloItem;
  onSave?: () => void;
}

const layoutNames: Record<LayoutType, string> = {
  A_PAC_PEQ: 'A.PAC.PEQ',
  AMP_CX: 'AMP.CX',
  AMP10: 'AMP10',
  A_PAC_GRAN: 'A.PAC.GRAN',
  TIRZ: 'TIRZ',
};

const FCGridEditor = ({ layoutType, previewData, onSave }: FCGridEditorProps) => {
  const { toast } = useToast();
  const [lines, setLines] = useState<string[]>(() => getTemplate(layoutType));
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const info = LAYOUT_INFO[layoutType];

  // Recarregar quando layout mudar
  useEffect(() => {
    setLines(getTemplate(layoutType));
    setSelectedField(null);
    setShowPreview(false);
  }, [layoutType]);

  // Atualizar cursor baseado na posição do textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLines = e.target.value.split('\n');
    // Enforce max rows
    const truncated = newLines.slice(0, info.rows);
    // Enforce max cols per line
    const enforced = truncated.map(l => l.substring(0, info.cols));
    setLines(enforced);
  }, [info.rows, info.cols]);

  const handleCursorMove = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const text = textareaRef.current.value;
    const beforeCursor = text.substring(0, pos);
    const linesBefore = beforeCursor.split('\n');
    setCursorLine(linesBefore.length);
    setCursorCol(linesBefore[linesBefore.length - 1].length + 1);
  }, []);

  const handleSave = () => {
    saveTemplate(layoutType, lines);
    toast({
      title: "Template salvo!",
      description: `Template do layout ${layoutNames[layoutType]} salvo com sucesso.`,
    });
    onSave?.();
  };

  const handleReset = () => {
    const reset = resetTemplate(layoutType);
    setLines(reset);
    toast({
      title: "Template resetado",
      description: "Restaurado para o template padrão do Fórmula Certa.",
    });
  };

  // Gerar dados de preview
  const getPreviewData = (): Record<string, string> => {
    if (previewData) {
      return {
        nomePaciente: previewData.nomePaciente || '',
        requisicao: `${previewData.nrRequisicao || ''}-${previewData.nrItem || ''}`,
        nomeMedico: previewData.nomeMedico || '',
        crm: `${previewData.prefixoCRM || ''}${previewData.numeroCRM || ''}/${previewData.ufCRM || ''}`,
        numeroRegistro: String(previewData.numeroRegistro || ''),
        formula: previewData.formula || previewData.composicao || '',
        lote: previewData.lote || '',
        dataFabricacao: previewData.dataFabricacao || '',
        dataValidade: previewData.dataValidade || '',
        ph: previewData.ph || '',
        tipoUso: previewData.tipoUso || '',
        aplicacao: previewData.aplicacao || '',
        contem: previewData.contem || '',
        posologia: previewData.posologia || '',
        textoLivre: previewData.textoLivre || '',
      };
    }
    return {
      nomePaciente: 'MARIA SILVA',
      requisicao: '123456-1',
      nomeMedico: 'JOAO SANTOS',
      crm: 'CRM12345/SP',
      numeroRegistro: '98765',
      formula: 'GLUTAMINA 200MG + L LISINA 150MG',
      lote: '001/25',
      dataFabricacao: '02/25',
      dataValidade: '08/25',
      ph: '7.0',
      tipoUso: 'USO INJETAVEL',
      aplicacao: 'ID/SC',
      contem: '5 FR. DE 2ML',
      posologia: 'CONFORME PRESCRICAO',
      textoLivre: '',
    };
  };

  // Renderizar grade com cores
  const renderGrid = () => {
    const displayLines = showPreview
      ? fillTemplate(lines, getPreviewData())
      : lines;

    return displayLines.map((line, lineIndex) => {
      if (showPreview) {
        // Preview: texto puro
        return (
          <div key={lineIndex} className="whitespace-pre leading-tight" style={{ height: '1.3em' }}>
            {line || ' '}
          </div>
        );
      }

      // Edição: mostrar campos coloridos
      const segments = parseTemplateLine(line);
      return (
        <div key={lineIndex} className="whitespace-pre leading-tight" style={{ height: '1.3em' }}>
          {segments.map((seg, segIdx) => {
            if (seg.type === 'field' && seg.fieldCode) {
              const fieldInfo = FIELD_CODES[seg.fieldCode];
              const isSelected = selectedField === seg.fieldCode;
              return (
                <span
                  key={segIdx}
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    backgroundColor: `${fieldInfo?.color || '#888'}30`,
                    color: fieldInfo?.color || '#888',
                    borderBottom: `2px solid ${fieldInfo?.color || '#888'}`,
                  }}
                  onClick={() => setSelectedField(seg.fieldCode!)}
                  title={`${fieldInfo?.label || seg.fieldCode} (${seg.width} chars)`}
                >
                  {seg.content}
                </span>
              );
            }
            return <span key={segIdx} className="text-foreground">{seg.content}</span>;
          })}
          {segments.length === 0 && <span className="text-muted-foreground/30">{'·'.repeat(info.cols)}</span>}
        </div>
      );
    });
  };

  // Legenda dos campos
  const usedFields = new Set<string>();
  lines.forEach(line => {
    parseTemplateLine(line).forEach(seg => {
      if (seg.type === 'field' && seg.fieldCode) usedFields.add(seg.fieldCode);
    });
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Lay-Out — {layoutNames[layoutType]}
          </h3>
          <p className="text-xs text-muted-foreground">
            {info.rows} LPP × {info.cols} CPP — Grade de caracteres estilo Fórmula Certa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? 'Editar' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Grade visual (somente leitura com cores) */}
      <div className="border-2 border-border rounded-lg overflow-hidden bg-white dark:bg-gray-950">
        {/* Régua de colunas */}
        <div className="bg-muted/50 border-b border-border px-3 py-0.5 overflow-x-auto">
          <div className="font-mono text-[9px] text-muted-foreground whitespace-pre select-none" style={{ letterSpacing: '0px' }}>
            {Array.from({ length: Math.ceil(info.cols / 10) }, (_, i) =>
              String((i + 1) * 10).padStart(10, '·')
            ).join('').substring(0, info.cols)}
          </div>
        </div>

        {/* Conteúdo da grade */}
        <div className="p-3 overflow-x-auto">
          <div
            className="font-mono text-xs"
            style={{ letterSpacing: '0px', lineHeight: '1.3em' }}
          >
            {renderGrid()}
          </div>
        </div>
      </div>

      {/* Textarea para edição direta do template */}
      {!showPreview && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Editar Template (texto bruto)</Label>
          <Textarea
            ref={textareaRef}
            value={lines.join('\n')}
            onChange={handleTextareaChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            className="font-mono text-xs min-h-[160px] resize-none"
            style={{ letterSpacing: '0px' }}
            spellCheck={false}
          />
          {/* Barra de status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded">
            <span>
              Lin: <span className="font-semibold text-foreground">{cursorLine}/{info.rows}</span>
              {' '}Col: <span className="font-semibold text-foreground">{cursorCol}/{info.cols}</span>
            </span>
            <span>Tecle TAB para selecionar os campos</span>
          </div>
        </div>
      )}

      {/* Legenda de campos */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Campos no template</Label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(usedFields).map(code => {
            const info = FIELD_CODES[code];
            if (!info) return null;
            const isSelected = selectedField === code;
            return (
              <button
                key={code}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-all ${
                  isSelected ? 'ring-2 ring-offset-1 font-bold' : ''
                }`}
                style={{
                  backgroundColor: `${info.color}20`,
                  color: info.color,
                  borderColor: info.color,
                  borderWidth: '1px',
                }}
                onClick={() => setSelectedField(isSelected ? null : code)}
              >
                @{code} = {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes do campo selecionado */}
      {selectedField && FIELD_CODES[selectedField] && (
        <div
          className="border rounded-lg p-3 space-y-2"
          style={{ borderColor: FIELD_CODES[selectedField].color + '60' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: FIELD_CODES[selectedField].color }}
            />
            <Label className="text-sm font-semibold">
              @{selectedField} — {FIELD_CODES[selectedField].label}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Dado: <code className="bg-muted px-1 rounded">{FIELD_CODES[selectedField].dataKey}</code>
            {' '}— Para alterar a largura do campo, edite o número de caracteres @{selectedField} repetidos no template.
          </p>
          {/* Mostrar em quais linhas o campo aparece */}
          <div className="text-xs text-muted-foreground">
            Aparece nas linhas:{' '}
            {lines.map((line, idx) => {
              const segs = parseTemplateLine(line);
              const found = segs.find(s => s.fieldCode === selectedField);
              if (found) return `${idx + 1} (${found.width} chars)`;
              return null;
            }).filter(Boolean).join(', ') || 'nenhuma'}
          </div>
        </div>
      )}
    </div>
  );
};

export default FCGridEditor;
