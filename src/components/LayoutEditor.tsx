import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Move, Eye, EyeOff } from "lucide-react";
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
  const [editedLayout, setEditedLayout] = useState<LayoutConfig>({ ...layout });
  const [selectedField, setSelectedField] = useState<LabelFieldId | null>(null);
  const [dragging, setDragging] = useState<LabelFieldId | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Dados de exemplo para preview
  const sampleData: Record<LabelFieldId, string> = {
    medico: 'DR CLEBER LEITE - CRM 12345/SP',
    paciente: 'MARIA SILVA',
    requisicao: 'REQ:12345-1',
    formula: 'LIDOCAÍNA 2%',
    lote: 'L:415/25',
    fabricacao: 'F:01/25',
    validade: 'V:01/26',
    ph: 'pH:7.0',
    aplicacao: 'APLICAÇÃO: ID/SC',
    tipoUso: 'USO INJETÁVEL',
    contem: 'CONTÉM: 5 FR. DE 2ML',
    posologia: 'Posologia: Conforme prescrição médica',
    observacoes: 'Obs: Manter refrigerado',
    registro: 'REG:12345',
  };

  const handleFieldUpdate = (fieldId: LabelFieldId, updates: Partial<FieldPosition>) => {
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
  };

  const handleMouseDown = (e: React.MouseEvent, fieldId: LabelFieldId) => {
    e.preventDefault();
    setDragging(fieldId);
    setSelectedField(fieldId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Limitar dentro do preview
    const clampedX = Math.max(0, Math.min(100 - editedLayout.campos[dragging].width, x));
    const clampedY = Math.max(0, Math.min(95, y));

    handleFieldUpdate(dragging, { x: clampedX, y: clampedY });
  }, [dragging, editedLayout.campos]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
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
    setEditedLayout(resetted);
    toast({
      title: "Layout resetado",
      description: "O layout foi restaurado para o padrão.",
    });
  };

  const allFields = Object.keys(editedLayout.campos) as LabelFieldId[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Editor de Layout: {editedLayout.nome}</span>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Preview do rótulo */}
            <div>
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                <Move className="h-3 w-3" />
                Arraste os campos para reposicioná-los
              </p>
              <div
                ref={previewRef}
                className="relative bg-white border-2 border-dashed border-primary/30 rounded-lg overflow-hidden"
                style={{ height: '300px' }}
              >
                {allFields.map((fieldId) => {
                  const field = editedLayout.campos[fieldId];
                  if (!field.visible) return null;

                  return (
                    <div
                      key={fieldId}
                      className={`absolute cursor-move px-1 py-0.5 rounded transition-all ${
                        selectedField === fieldId
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:bg-muted/50'
                      } ${dragging === fieldId ? 'opacity-70' : ''}`}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        fontSize: `${field.fontSize}px`,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, fieldId)}
                      onClick={() => setSelectedField(fieldId)}
                    >
                      <span className="text-foreground whitespace-nowrap overflow-hidden text-ellipsis block">
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
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2">
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
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{fieldLabels[fieldId]}</span>
                        <div className="flex items-center gap-2">
                          {field.visible ? (
                            <Eye className="h-3 w-3 text-muted-foreground" />
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
                              min={8}
                              max={16}
                              step={1}
                              onValueChange={([v]) => handleFieldUpdate(fieldId, { fontSize: v })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Largura: {field.width.toFixed(0)}%</Label>
                            <Slider
                              value={[field.width]}
                              min={10}
                              max={100}
                              step={5}
                              onValueChange={([v]) => handleFieldUpdate(fieldId, { width: v })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>X: {field.x.toFixed(0)}%</span>
                            <span>Y: {field.y.toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayoutEditor;
