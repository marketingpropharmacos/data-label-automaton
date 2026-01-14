import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RotuloItem, PharmacyConfig, LabelConfig, LayoutConfig, LabelFieldId } from "@/types/requisicao";
import PharmacyHeader from "./PharmacyHeader";

interface LabelCardProps {
  rotulo: RotuloItem;
  pharmacyConfig: PharmacyConfig;
  labelConfig: LabelConfig;
  layoutConfig: LayoutConfig;
  selected: boolean;
  onToggle: (id: string) => void;
  onUpdate?: (id: string, field: string, value: string) => void;
}

const LabelCard = ({ rotulo, pharmacyConfig, labelConfig, layoutConfig, selected, onToggle, onUpdate }: LabelCardProps) => {
  // Converter mm para pixels aproximados (96 DPI / 25.4mm)
  const mmToPx = (mm: number) => Math.round(mm * 3.78);
  
  const labelStyle = {
    width: `${mmToPx(labelConfig.larguraMM)}px`,
    minHeight: `${mmToPx(labelConfig.alturaMM)}px`,
  };

  const formatarMedico = () => {
    if (!rotulo.numeroCRM) return null;
    // Formato: DR NOME COMPLETO - CRM 12345/UF (sem ponto no DR/DRA)
    const prefixo = (rotulo.prefixoCRM || 'DR').toUpperCase().replace(/\./g, '');
    if (rotulo.nomeMedico) {
      return `${prefixo} ${rotulo.nomeMedico.toUpperCase()} - CRM ${rotulo.numeroCRM}/${rotulo.ufCRM}`;
    }
    return `${prefixo} CRM ${rotulo.numeroCRM}/${rotulo.ufCRM}`;
  };

  // Formatar data curta (MM/AA)
  const formatarDataCurta = (data: string) => {
    if (!data) return "";
    const partes = data.split('/');
    if (partes.length === 3) {
      return `${partes[1]}/${partes[2].slice(-2)}`;
    }
    return data;
  };

  // Remover prefixo "AMP " do nome da fórmula
  const formatarFormula = (formula: string) => {
    if (!formula) return "";
    let nome = formula;
    if (nome.toUpperCase().startsWith("AMP ")) {
      nome = nome.substring(4);
    }
    return nome.toUpperCase();
  };

  // Formatar lote como lote/ano (ex: 415/25)
  const formatarLote = () => {
    const lote = rotulo.lote || "";
    // Se já tem barra, retorna como está
    if (lote.includes('/')) return lote;
    // Extrai ano da data de fabricação
    const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
    return lote ? `${lote}/${ano}` : "";
  };

  // Obter posição do campo
  const getFieldStyle = (fieldId: LabelFieldId) => {
    const field = layoutConfig.campos[fieldId];
    if (!field || !field.visible) return null;
    return {
      position: 'absolute' as const,
      left: `${field.x}%`,
      top: `${field.y}%`,
      width: `${field.width}%`,
      fontSize: `${field.fontSize}px`,
    };
  };

  // Verificar se campo está visível
  const isFieldVisible = (fieldId: LabelFieldId) => {
    const field = layoutConfig.campos[fieldId];
    return field?.visible ?? true;
  };

  // Renderizar campo com posicionamento dinâmico
  const renderField = (fieldId: LabelFieldId, content: React.ReactNode) => {
    const style = getFieldStyle(fieldId);
    if (!style) return null;
    return (
      <div style={style} className="leading-tight">
        {content}
      </div>
    );
  };

  return (
    <Card className="p-4 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(rotulo.id)}
          className="mt-2"
        />
        
        {/* Preview do Rótulo - Layout dinâmico */}
        <div 
          className="flex-1 bg-white border border-border rounded p-3 font-mono text-foreground overflow-hidden relative"
          style={{ ...labelStyle, minHeight: '180px' }}
        >
          {/* Cabeçalho da Farmácia - fixo no topo */}
          <PharmacyHeader config={pharmacyConfig} compact />
          
          {/* Área de campos posicionáveis */}
          <div className="relative mt-2" style={{ height: 'calc(100% - 40px)' }}>
            {/* Paciente */}
            {renderField('paciente', (
              <span className="font-bold text-foreground uppercase">
                {rotulo.nomePaciente}
              </span>
            ))}

            {/* Requisição */}
            {renderField('requisicao', (
              <span className="font-medium">
                REQ:{rotulo.nrRequisicao}-{rotulo.nrItem}
              </span>
            ))}

            {/* Fórmula */}
            {renderField('formula', (
              <span className="font-bold text-primary uppercase">
                {formatarFormula(rotulo.formula)}
              </span>
            ))}

            {/* Lote */}
            {renderField('lote', (
              <span>L:{formatarLote() || "___"}</span>
            ))}

            {/* Fabricação */}
            {renderField('fabricacao', (
              <span>F:{formatarDataCurta(rotulo.dataFabricacao)}</span>
            ))}

            {/* Validade */}
            {renderField('validade', (
              <span>V:{formatarDataCurta(rotulo.dataValidade)}</span>
            ))}

            {/* pH */}
            {renderField('ph', (
              <span className="flex items-center">
                pH:
                <input
                  type="text"
                  value={rotulo.ph || ""}
                  onChange={(e) => onUpdate?.(rotulo.id, 'ph', e.target.value)}
                  placeholder="7.0"
                  className="ml-1 w-10 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary"
                  style={{ fontSize: 'inherit' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            ))}

            {/* Tipo de Uso */}
            {renderField('tipoUso', (
              <span className="uppercase">{rotulo.tipoUso || "USO"}</span>
            ))}

            {/* Aplicação */}
            {renderField('aplicacao', (
              <span className="font-medium">
                APLICAÇÃO:
                {rotulo.aplicacao ? (
                  <span className="ml-1 uppercase">{rotulo.aplicacao}</span>
                ) : (
                  <input
                    type="text"
                    value={rotulo.aplicacao || ""}
                    onChange={(e) => onUpdate?.(rotulo.id, 'aplicacao', e.target.value)}
                    placeholder="ID/SC"
                    className="ml-1 w-16 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary uppercase"
                    style={{ fontSize: 'inherit' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </span>
            ))}

            {/* Contém */}
            {renderField('contem', (
              <span>
                CONTÉM:
                <input
                  type="text"
                  value={rotulo.contem || ""}
                  onChange={(e) => onUpdate?.(rotulo.id, 'contem', e.target.value)}
                  placeholder="5 FR. DE 2ML"
                  className="ml-1 w-24 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary uppercase"
                  style={{ fontSize: 'inherit' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            ))}

            {/* Registro */}
            {isFieldVisible('registro') && rotulo.numeroRegistro && renderField('registro', (
              <span>REG:{rotulo.numeroRegistro}</span>
            ))}

            {/* Médico */}
            {isFieldVisible('medico') && formatarMedico() && renderField('medico', (
              <span className="uppercase">{formatarMedico()}</span>
            ))}

            {/* Posologia */}
            {isFieldVisible('posologia') && rotulo.posologia && renderField('posologia', (
              <span className="border-t border-dashed border-foreground/20 pt-1 block">
                <span className="text-muted-foreground">Posologia:</span> {rotulo.posologia}
              </span>
            ))}

            {/* Observações */}
            {isFieldVisible('observacoes') && rotulo.observacoes && renderField('observacoes', (
              <span className="border-t border-dashed border-foreground/20 pt-1 text-muted-foreground italic block">
                <span className="font-medium not-italic">Obs:</span> {rotulo.observacoes}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LabelCard;
