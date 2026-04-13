import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, GripVertical, ChevronUp, ChevronDown, Plus, Trash2, Bold, Type } from "lucide-react";
import { LayoutConfig, LabelFieldId, FieldConfig, LineConfig, RotuloItem, PharmacyConfig, LabelConfig } from "@/types/requisicao";
import { fieldLabels, saveLayout, resetLayout, LAYOUTS_STORAGE_KEY } from "@/config/layouts";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SystemConfigService } from "@/services/systemConfigService";

// Dimensões fixas do preview
const PREVIEW_WIDTH = 380;

interface LayoutEditorProps {
  layout: LayoutConfig;
  onSave: (layout: LayoutConfig) => void;
  onClose?: () => void;
  previewData?: RotuloItem;
  pharmacyConfig?: PharmacyConfig;
  labelConfig?: LabelConfig;
}

// Todos os campos disponíveis
const allFieldIds: LabelFieldId[] = [
  'paciente', 'requisicao', 'formula', 'lote', 'fabricacao', 'validade', 
  'ph', 'tipoUso', 'aplicacao', 'contem', 'registro', 'medico', 'posologia', 'observacoes'
];

const LayoutEditor = ({ 
  layout, 
  onSave, 
  onClose, 
  previewData,
  pharmacyConfig,
  labelConfig 
}: LayoutEditorProps) => {
  const { toast } = useToast();
  const [editedLayout, setEditedLayout] = useState<LayoutConfig>(() => 
    JSON.parse(JSON.stringify(layout))
  );
  const [selectedLine, setSelectedLine] = useState<number>(0);
  const [selectedField, setSelectedField] = useState<LabelFieldId | null>(null);

  // Reset quando layout mudar
  useEffect(() => {
    setEditedLayout(JSON.parse(JSON.stringify(layout)));
    setSelectedLine(0);
    setSelectedField(null);
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
        composicao: previewData.composicao?.toUpperCase() || '',
        requisicao: `REQ: ${previewData.nrRequisicao || ''}-${previewData.nrItem || ''}`,
        formula: formatarFormula(previewData.formula || previewData.descricaoProduto || ''),
        lote: `L: ${formatarLote() || '___'}`,
        fabricacao: `F: ${formatarDataCurta(previewData.dataFabricacao)}`,
        validade: `V: ${formatarDataCurta(previewData.dataValidade)}`,
        ph: previewData.ph ? `pH: ${previewData.ph}` : 'pH: ___',
        aplicacao: `APLICAÇÃO: ${previewData.aplicacao?.toUpperCase() || '___'}`,
        tipoUso: previewData.tipoUso?.toUpperCase() || 'USO INJETÁVEL',
        contem: `CONT: ${previewData.contem?.toUpperCase() || '___'}`,
        posologia: previewData.posologia ? `Pos: ${previewData.posologia}` : '',
        observacoes: previewData.observacoes ? `Obs: ${previewData.observacoes}` : '',
        registro: previewData.numeroRegistro ? `REG: ${previewData.numeroRegistro}` : '',
      };
    }
    
    return {
      medico: 'DR EXEMPLO - CRM 0000/XX',
      paciente: 'PACIENTE EXEMPLO',
      composicao: 'GLUTAMINA 200MG + L LISINA 150MG',
      requisicao: 'REQ: 000000-0',
      formula: 'FORMULA EXEMPLO',
      lote: 'L: 000/00',
      fabricacao: 'F: 00/00',
      validade: 'V: 00/00',
      ph: 'pH: 7.0',
      aplicacao: 'APLICAÇÃO: ID/SC',
      tipoUso: 'USO INJETÁVEL',
      contem: 'CONT: 5 FR.',
      posologia: 'Pos: Conforme prescrição',
      observacoes: 'Obs: Exemplo',
      registro: 'REG: 00000',
    };
  };

  const displayData = getDisplayData();

  // Atualizar configuração de campo
  const updateFieldConfig = useCallback((fieldId: LabelFieldId, updates: Partial<FieldConfig>) => {
    setEditedLayout(prev => ({
      ...prev,
      campoConfig: {
        ...prev.campoConfig,
        [fieldId]: {
          ...prev.campoConfig[fieldId],
          ...updates,
        },
      },
    }));
  }, []);

  // Atualizar linha
  const updateLine = useCallback((lineIndex: number, updates: Partial<LineConfig>) => {
    setEditedLayout(prev => ({
      ...prev,
      linhas: prev.linhas.map((linha, idx) => 
        idx === lineIndex ? { ...linha, ...updates } : linha
      ),
    }));
  }, []);

  // Mover linha para cima/baixo
  const moveLine = useCallback((lineIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
    if (targetIndex < 0 || targetIndex >= editedLayout.linhas.length) return;
    
    setEditedLayout(prev => {
      const newLinhas = [...prev.linhas];
      [newLinhas[lineIndex], newLinhas[targetIndex]] = [newLinhas[targetIndex], newLinhas[lineIndex]];
      return { ...prev, linhas: newLinhas };
    });
    setSelectedLine(targetIndex);
  }, [editedLayout.linhas.length]);

  // Adicionar campo à linha
  const addFieldToLine = useCallback((lineIndex: number, fieldId: LabelFieldId) => {
    setEditedLayout(prev => ({
      ...prev,
      linhas: prev.linhas.map((linha, idx) => 
        idx === lineIndex && !linha.campos.includes(fieldId)
          ? { ...linha, campos: [...linha.campos, fieldId] }
          : linha
      ),
    }));
  }, []);

  // Remover campo da linha
  const removeFieldFromLine = useCallback((lineIndex: number, fieldId: LabelFieldId) => {
    setEditedLayout(prev => ({
      ...prev,
      linhas: prev.linhas.map((linha, idx) => 
        idx === lineIndex
          ? { ...linha, campos: linha.campos.filter(c => c !== fieldId) }
          : linha
      ),
    }));
  }, []);

  // Adicionar nova linha
  const addNewLine = useCallback(() => {
    setEditedLayout(prev => ({
      ...prev,
      linhas: [...prev.linhas, { 
        id: `linha${prev.linhas.length + 1}`, 
        campos: [], 
        spacing: 'normal' 
      }],
    }));
    setSelectedLine(editedLayout.linhas.length);
  }, [editedLayout.linhas.length]);

  // Remover linha
  const removeLine = useCallback((lineIndex: number) => {
    if (editedLayout.linhas.length <= 1) return;
    setEditedLayout(prev => ({
      ...prev,
      linhas: prev.linhas.filter((_, idx) => idx !== lineIndex),
    }));
    setSelectedLine(Math.max(0, lineIndex - 1));
  }, [editedLayout.linhas.length]);

  // Campos não usados em nenhuma linha
  const getUnusedFields = (): LabelFieldId[] => {
    const usedFields = new Set(editedLayout.linhas.flatMap(l => l.campos));
    return allFieldIds.filter(f => !usedFields.has(f));
  };

  const handleSave = async () => {
    saveLayout(editedLayout);
    const savedLayoutsRaw = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    if (savedLayoutsRaw) {
      await SystemConfigService.saveLabelLayouts(JSON.parse(savedLayoutsRaw));
    }
    onSave(editedLayout);
    toast({
      title: "Layout salvo!",
      description: `O layout ${editedLayout.nome} foi salvo com sucesso.`,
    });
  };

  const handleReset = () => {
    const resetted = resetLayout(layout.tipo);
    setEditedLayout(JSON.parse(JSON.stringify(resetted)));
    setSelectedLine(0);
    setSelectedField(null);
    toast({
      title: "Layout resetado",
      description: "O layout foi restaurado para o padrão.",
    });
  };

  const defaultPharmacyConfig: PharmacyConfig = pharmacyConfig || {
    nome: "FARMÁCIA EXEMPLO",
    telefone: "(00) 0000-0000",
    endereco: "Endereço Exemplo",
    cnpj: "00.000.000/0000-00",
    farmaceutico: "Farm. Exemplo",
    crf: "CRF-XX 0000"
  };

  const getLineSpacing = (spacing?: string): string => {
    switch (spacing) {
      case 'compact': return 'gap-2';
      case 'wide': return 'gap-4';
      default: return 'gap-3';
    }
  };

  return (
    <div className="space-y-4">
      {/* Botões de ação */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Organize os campos em linhas (estilo documento)
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
        {/* Preview do rótulo */}
        <div className="space-y-2">
          <div 
            className="bg-white border-2 border-dashed border-primary/30 rounded-lg overflow-hidden"
            style={{ width: `${PREVIEW_WIDTH}px` }}
          >
            {/* Cabeçalho da Farmácia */}
            <div className="text-center border-b border-gray-200 bg-gray-50 py-2 px-3">
              <p className="font-bold text-xs text-gray-800 truncate">{defaultPharmacyConfig.nome}</p>
              <p className="text-[10px] text-gray-600">{defaultPharmacyConfig.telefone}</p>
            </div>
            
            {/* Área de campos em linhas */}
            <div className="p-3 space-y-1 font-mono min-h-[180px]">
              {editedLayout.linhas.map((linha, lineIndex) => {
                const camposVisiveis = linha.campos.filter(f => editedLayout.campoConfig[f]?.visible);
                if (camposVisiveis.length === 0 && lineIndex !== selectedLine) return null;

                const isSelected = lineIndex === selectedLine;

                return (
                  <div 
                    key={linha.id}
                    className={`flex flex-wrap items-baseline rounded px-1 py-0.5 cursor-pointer transition-all ${getLineSpacing(linha.spacing)} ${
                      isSelected ? 'bg-blue-100 ring-1 ring-primary' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLine(lineIndex)}
                  >
                    {camposVisiveis.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Linha vazia - adicione campos</span>
                    ) : (
                      camposVisiveis.map((fieldId) => {
                        const config = editedLayout.campoConfig[fieldId];
                        const isFieldSelected = selectedField === fieldId;
                        
                        return (
                          <span
                            key={fieldId}
                            className={`leading-tight cursor-pointer rounded px-0.5 transition-all ${
                              config.bold ? 'font-bold' : ''
                            } ${config.uppercase ? 'uppercase' : ''} ${
                              isFieldSelected ? 'bg-primary/20 ring-1 ring-primary' : ''
                            }`}
                            style={{ fontSize: `${config.fontSize}px` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedField(fieldId);
                              setSelectedLine(lineIndex);
                            }}
                          >
                            {displayData[fieldId]}
                          </span>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Clique em uma linha para editar, clique em um campo para ajustar
          </p>
        </div>

        {/* Painel de edição */}
        <div className="space-y-4">
          {/* Editor de linhas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Linhas do Rótulo</Label>
              <Button variant="outline" size="sm" onClick={addNewLine}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Linha
              </Button>
            </div>
            
            <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded-lg p-2">
              {editedLayout.linhas.map((linha, lineIndex) => {
                const isSelected = lineIndex === selectedLine;
                
                return (
                  <div
                    key={linha.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                      isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedLine(lineIndex)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      {linha.campos.length === 0 
                        ? <span className="text-muted-foreground italic">Linha vazia</span>
                        : linha.campos.map(f => fieldLabels[f]).join(' | ')
                      }
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLine(lineIndex, 'up'); }}
                        disabled={lineIndex === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLine(lineIndex, 'down'); }}
                        disabled={lineIndex === editedLayout.linhas.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeLine(lineIndex); }}
                        disabled={editedLayout.linhas.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editar linha selecionada */}
          {selectedLine !== null && editedLayout.linhas[selectedLine] && (
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-sm font-medium">Editando: Linha {selectedLine + 1}</Label>
              
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground">Espaçamento:</Label>
                <Select 
                  value={editedLayout.linhas[selectedLine].spacing || 'normal'}
                  onValueChange={(v) => updateLine(selectedLine, { spacing: v as any })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacto</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Amplo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Campos nesta linha:</Label>
                <div className="flex flex-wrap gap-1">
                  {editedLayout.linhas[selectedLine].campos.map((fieldId) => (
                    <div
                      key={fieldId}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-all ${
                        selectedField === fieldId 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedField(fieldId)}
                    >
                      {fieldLabels[fieldId]}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFieldFromLine(selectedLine, fieldId);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Adicionar campo */}
                {getUnusedFields().length > 0 && (
                  <Select onValueChange={(v) => addFieldToLine(selectedLine, v as LabelFieldId)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="+ Adicionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUnusedFields().map((fieldId) => (
                        <SelectItem key={fieldId} value={fieldId}>
                          {fieldLabels[fieldId]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Editar campo selecionado */}
          {selectedField && (
            <div className="border rounded-lg p-3 space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Type className="h-4 w-4" />
                Campo: {fieldLabels[selectedField]}
              </Label>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Visível</Label>
                <Switch
                  checked={editedLayout.campoConfig[selectedField].visible}
                  onCheckedChange={(checked) => updateFieldConfig(selectedField, { visible: checked })}
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Tamanho da fonte: <span className="font-semibold">{editedLayout.campoConfig[selectedField].fontSize}px</span>
                </Label>
                <Slider
                  value={[editedLayout.campoConfig[selectedField].fontSize]}
                  min={6}
                  max={18}
                  step={1}
                  onValueChange={([v]) => updateFieldConfig(selectedField, { fontSize: v })}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editedLayout.campoConfig[selectedField].bold || false}
                    onCheckedChange={(checked) => updateFieldConfig(selectedField, { bold: checked })}
                  />
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Bold className="h-3 w-3" />
                    Negrito
                  </Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editedLayout.campoConfig[selectedField].uppercase || false}
                    onCheckedChange={(checked) => updateFieldConfig(selectedField, { uppercase: checked })}
                  />
                  <Label className="text-xs text-muted-foreground">MAIÚSCULAS</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutEditor;
