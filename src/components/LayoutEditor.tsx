import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Move, Eye, EyeOff, GripVertical } from "lucide-react";
import { LayoutConfig, LabelFieldId, FieldPosition, RotuloItem, PharmacyConfig, LabelConfig } from "@/types/requisicao";
import { fieldLabels, saveLayout, resetLayout } from "@/config/layouts";
import { useToast } from "@/hooks/use-toast";

// Dimensões fixas do preview (em pixels)
const PREVIEW_WIDTH = 380;
const PREVIEW_HEIGHT = 220;
const HEADER_HEIGHT = 40;
const FIELDS_HEIGHT = PREVIEW_HEIGHT - HEADER_HEIGHT;

interface LayoutEditorProps {
  layout: LayoutConfig;
  onSave: (layout: LayoutConfig) => void;
  onClose?: () => void;
  previewData?: RotuloItem;
  pharmacyConfig?: PharmacyConfig;
  labelConfig?: LabelConfig;
}

const LayoutEditor = forwardRef<HTMLDivElement, LayoutEditorProps>(({ 
  layout, 
  onSave, 
  onClose, 
  previewData,
  pharmacyConfig,
  labelConfig 
}, ref) => {
  const { toast } = useToast();
  const [editedLayout, setEditedLayout] = useState<LayoutConfig>(() => 
    JSON.parse(JSON.stringify(layout))
  );
  const [selectedField, setSelectedField] = useState<LabelFieldId | null>(null);
  const [dragging, setDragging] = useState<LabelFieldId | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Reset quando layout mudar
  useEffect(() => {
    setEditedLayout(JSON.parse(JSON.stringify(layout)));
  }, [layout]);

  // Dados para preview
  const getDisplayData = (): Record<LabelFieldId, string> => {
    if (previewData) {
      const formatarDataCurta = (data: string) => {
        if (!data) return "";
        const partes = data.split('/');
        if (partes.length === 3) {
          return `${partes[1]}/${partes[2].slice(-2)}`;
        }
        return data;
      };

      const formatarLote = () => {
        const lote = previewData.lote || "";
        if (lote.includes('/')) return lote;
        const ano = formatarDataCurta(previewData.dataFabricacao).split('/')[1] || "";
        return lote ? `${lote}/${ano}` : "";
      };

      const formatarFormula = (formula: string) => {
        if (!formula) return "";
        let nome = formula;
        if (nome.toUpperCase().startsWith("AMP ")) {
          nome = nome.substring(4);
        }
        return nome.toUpperCase();
      };

      return {
        medico: previewData.numeroCRM 
          ? `${(previewData.prefixoCRM || 'DR').toUpperCase()} ${previewData.nomeMedico?.toUpperCase() || ''} - CRM ${previewData.numeroCRM}/${previewData.ufCRM}`
          : '',
        paciente: previewData.nomePaciente || '',
        requisicao: `REQ:${previewData.nrRequisicao || ''}-${previewData.nrItem || ''}`,
        formula: formatarFormula(previewData.formula || previewData.descricaoProduto || ''),
        lote: `L:${formatarLote() || '___'}`,
        fabricacao: `F:${formatarDataCurta(previewData.dataFabricacao)}`,
        validade: `V:${formatarDataCurta(previewData.dataValidade)}`,
        ph: previewData.ph ? `pH:${previewData.ph}` : 'pH:___',
        aplicacao: `APLIC:${previewData.aplicacao?.toUpperCase() || '___'}`,
        tipoUso: previewData.tipoUso?.toUpperCase() || 'USO',
        contem: `CONT:${previewData.contem?.toUpperCase() || '___'}`,
        posologia: previewData.posologia ? `Pos: ${previewData.posologia}` : '',
        observacoes: previewData.observacoes ? `Obs: ${previewData.observacoes}` : '',
        registro: previewData.numeroRegistro ? `REG:${previewData.numeroRegistro}` : '',
      };
    }
    
    return {
      medico: 'DR EXEMPLO - CRM 0000/XX',
      paciente: 'PACIENTE EXEMPLO',
      requisicao: 'REQ:000000-0',
      formula: 'FORMULA EXEMPLO',
      lote: 'L:000/00',
      fabricacao: 'F:00/00',
      validade: 'V:00/00',
      ph: 'pH:0.0',
      aplicacao: 'APLIC:IM/EV/SC',
      tipoUso: 'USO EXEMPLO',
      contem: 'CONT:EXEMPLO',
      posologia: 'Pos: Conforme prescrição',
      observacoes: 'Obs: Exemplo',
      registro: 'REG:00000',
    };
  };

  const displayData = getDisplayData();

  const handleFieldUpdate = useCallback((fieldId: LabelFieldId, updates: Partial<FieldPosition>) => {
    setEditedLayout(prev => ({
      ...prev,
      campos: {
        ...prev.campos,
        [fieldId]: {
          ...prev.campos[fieldId],
          ...updates,
        },
      },
    }));
  }, []);

  const handleMouseDown = (e: React.MouseEvent, fieldId: LabelFieldId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const field = editedLayout.campos[fieldId];
    
    const fieldX = (field.x / 100) * rect.width;
    const fieldY = (field.y / 100) * rect.height;
    
    setDragOffset({
      x: e.clientX - rect.left - fieldX,
      y: e.clientY - rect.top - fieldY
    });
    
    setDragging(fieldId);
    setSelectedField(fieldId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(95, x));
    const clampedY = Math.max(0, Math.min(90, y));

    handleFieldUpdate(dragging, { x: clampedX, y: clampedY });
  }, [dragging, dragOffset, handleFieldUpdate]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleSave = () => {
    saveLayout(editedLayout);
    onSave(editedLayout);
    toast({
      title: "Layout salvo!",
      description: `O layout ${editedLayout.nome} foi salvo com sucesso.`,
    });
  };

  const handleReset = () => {
    const resetted = resetLayout(layout.tipo);
    setEditedLayout(JSON.parse(JSON.stringify(resetted)));
    toast({
      title: "Layout resetado",
      description: "O layout foi restaurado para o padrão.",
    });
  };

  const allFields = Object.keys(editedLayout.campos) as LabelFieldId[];

  const defaultPharmacyConfig: PharmacyConfig = pharmacyConfig || {
    nome: "FARMÁCIA EXEMPLO",
    telefone: "(00) 0000-0000",
    endereco: "Endereço Exemplo",
    cnpj: "00.000.000/0000-00",
    farmaceutico: "Farm. Exemplo",
    crf: "CRF-XX 0000"
  };

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Move className="h-4 w-4" />
          Arraste os campos para reposicioná-los
        </p>
        <div className="flex gap-2">
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

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        {/* Preview do rótulo - dimensões fixas */}
        <div className="space-y-2">
          <div 
            className="bg-white border-2 border-dashed border-primary/30 rounded-lg overflow-hidden"
            style={{ width: `${PREVIEW_WIDTH}px` }}
          >
            {/* Cabeçalho simplificado da Farmácia */}
            <div 
              className="text-center border-b border-gray-200 bg-gray-50 py-2 px-3"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              <p className="font-bold text-xs text-gray-800 truncate">{defaultPharmacyConfig.nome}</p>
              <p className="text-[10px] text-gray-600">{defaultPharmacyConfig.telefone}</p>
            </div>
            
            {/* Área de campos posicionáveis */}
            <div
              ref={previewRef}
              className="relative select-none font-mono bg-white"
              style={{ height: `${FIELDS_HEIGHT}px` }}
            >
              {/* Grid de fundo */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(to right, #999 1px, transparent 1px), linear-gradient(to bottom, #999 1px, transparent 1px)',
                  backgroundSize: '10% 10%'
                }}
              />
              
              {allFields.map((fieldId) => {
                const field = editedLayout.campos[fieldId];
                if (!field.visible) return null;

                const isSelected = selectedField === fieldId;
                const isDragging = dragging === fieldId;

                return (
                  <div
                    key={fieldId}
                    className={`absolute cursor-grab active:cursor-grabbing flex items-center gap-1 px-1 rounded transition-all select-none ${
                      isSelected
                        ? 'ring-2 ring-primary bg-blue-100 z-20'
                        : 'hover:bg-blue-50 z-10'
                    } ${isDragging ? 'opacity-70 shadow-md z-30' : ''}`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      maxWidth: `${field.width}%`,
                      fontSize: `${field.fontSize}px`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, fieldId)}
                  >
                    <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                      {displayData[fieldId]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Preview: {PREVIEW_WIDTH}×{PREVIEW_HEIGHT}px
          </p>
        </div>

        {/* Painel de propriedades */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Campos do Rótulo</p>
          
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {allFields.map((fieldId) => {
              const field = editedLayout.campos[fieldId];
              const isSelected = selectedField === fieldId;

              return (
                <div
                  key={fieldId}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 bg-card'
                  }`}
                  onClick={() => setSelectedField(fieldId)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{fieldLabels[fieldId]}</span>
                    <div className="flex items-center gap-2">
                      {field.visible ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={field.visible}
                        onCheckedChange={(checked) =>
                          handleFieldUpdate(fieldId, { visible: checked })
                        }
                      />
                    </div>
                  </div>

                  {isSelected && field.visible && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Fonte: <span className="font-semibold text-foreground">{field.fontSize}px</span>
                        </Label>
                        <Slider
                          value={[field.fontSize]}
                          min={6}
                          max={18}
                          step={1}
                          onValueChange={([v]) => handleFieldUpdate(fieldId, { fontSize: v })}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Largura: <span className="font-semibold text-foreground">{field.width.toFixed(0)}%</span>
                        </Label>
                        <Slider
                          value={[field.width]}
                          min={10}
                          max={100}
                          step={5}
                          onValueChange={([v]) => handleFieldUpdate(fieldId, { width: v })}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            X: <span className="font-semibold text-foreground">{field.x.toFixed(0)}%</span>
                          </Label>
                          <Slider
                            value={[field.x]}
                            min={0}
                            max={90}
                            step={1}
                            onValueChange={([v]) => handleFieldUpdate(fieldId, { x: v })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Y: <span className="font-semibold text-foreground">{field.y.toFixed(0)}%</span>
                          </Label>
                          <Slider
                            value={[field.y]}
                            min={0}
                            max={90}
                            step={1}
                            onValueChange={([v]) => handleFieldUpdate(fieldId, { y: v })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

LayoutEditor.displayName = "LayoutEditor";

export default LayoutEditor;
