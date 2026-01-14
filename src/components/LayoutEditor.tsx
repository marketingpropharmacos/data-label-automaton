import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Move, Eye, EyeOff, GripVertical } from "lucide-react";
import { LayoutConfig, LabelFieldId, FieldPosition } from "@/types/requisicao";
import { fieldLabels, saveLayout, resetLayout } from "@/config/layouts";
import { useToast } from "@/hooks/use-toast";

interface LayoutEditorProps {
  layout: LayoutConfig;
  onSave: (layout: LayoutConfig) => void;
  onClose?: () => void;
}

const LayoutEditor = ({ layout, onSave, onClose }: LayoutEditorProps) => {
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

  // Dados de exemplo para preview
  const sampleData: Record<LabelFieldId, string> = {
    medico: 'DR CLEBER LEITE CREFITO-SC-10749',
    paciente: 'IBES CURSOS E POS',
    requisicao: 'REQ:005537-4',
    formula: 'CURCUMINA 200MG',
    lote: 'L:297/25',
    fabricacao: 'F:11/25',
    validade: 'V:11/26',
    ph: 'pH:6.0',
    aplicacao: 'APLICAÇÃO: IM/EV/SC',
    tipoUso: 'USO EM CONSULTÓRIO',
    contem: 'CONTÉM: 2KITS C/4 FR. DE 2ML',
    posologia: 'Posologia: Conforme prescrição',
    observacoes: 'Obs: Manter refrigerado',
    registro: 'REQ:11549',
  };

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

    // Limitar dentro do preview
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 mb-2">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Resetar
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          Salvar
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview do rótulo */}
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Move className="h-3 w-3" />
            Arraste os campos para reposicioná-los
          </p>
          <div
            ref={previewRef}
            className="relative bg-white border-2 border-dashed border-primary/50 rounded-lg overflow-hidden select-none"
            style={{ height: '350px', minWidth: '400px' }}
          >
            {/* Grid de fundo para ajudar no posicionamento */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)',
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
                  className={`absolute cursor-grab active:cursor-grabbing flex items-center gap-1 px-1 py-0.5 rounded transition-colors select-none ${
                    isSelected
                      ? 'ring-2 ring-primary bg-primary/20 z-20'
                      : 'hover:bg-primary/10 z-10'
                  } ${isDragging ? 'opacity-80 shadow-lg z-30' : ''}`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    maxWidth: `${field.width}%`,
                    fontSize: `${field.fontSize}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, fieldId)}
                >
                  <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {sampleData[fieldId]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel de propriedades */}
        <div className="space-y-4">
          <p className="text-sm font-medium">Campos do Rótulo</p>
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2">
            {allFields.map((fieldId) => {
              const field = editedLayout.campos[fieldId];
              const isSelected = selectedField === fieldId;

              return (
                <div
                  key={fieldId}
                  className={`p-2 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedField(fieldId)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{fieldLabels[fieldId]}</span>
                    <div className="flex items-center gap-2">
                      {field.visible ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
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
                    <div className="space-y-3 mt-3 pt-3 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs">Tamanho da fonte: {field.fontSize}px</Label>
                        <Slider
                          value={[field.fontSize]}
                          min={6}
                          max={18}
                          step={1}
                          onValueChange={([v]) => handleFieldUpdate(fieldId, { fontSize: v })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Largura máxima: {field.width.toFixed(0)}%</Label>
                        <Slider
                          value={[field.width]}
                          min={10}
                          max={100}
                          step={5}
                          onValueChange={([v]) => handleFieldUpdate(fieldId, { width: v })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Posição X: {field.x.toFixed(0)}%</Label>
                          <Slider
                            value={[field.x]}
                            min={0}
                            max={90}
                            step={1}
                            onValueChange={([v]) => handleFieldUpdate(fieldId, { x: v })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Posição Y: {field.y.toFixed(0)}%</Label>
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
};

export default LayoutEditor;
