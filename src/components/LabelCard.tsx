import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RotuloItem, PharmacyConfig, LabelConfig } from "@/types/requisicao";
import PharmacyHeader from "./PharmacyHeader";

interface LabelCardProps {
  rotulo: RotuloItem;
  pharmacyConfig: PharmacyConfig;
  labelConfig: LabelConfig;
  selected: boolean;
  onToggle: (id: string) => void;
}

const LabelCard = ({ rotulo, pharmacyConfig, labelConfig, selected, onToggle }: LabelCardProps) => {
  // Converter mm para pixels aproximados (96 DPI / 25.4mm)
  const mmToPx = (mm: number) => Math.round(mm * 3.78);
  
  const labelStyle = {
    width: `${mmToPx(labelConfig.larguraMM)}px`,
    minHeight: `${mmToPx(labelConfig.alturaMM)}px`,
  };

  const formatarMedico = () => {
    if (!rotulo.numeroCRM) return null;
    if (rotulo.nomeMedico) {
      return `${rotulo.prefixoCRM || 'Dr.'} ${rotulo.nomeMedico} - CRM ${rotulo.numeroCRM}/${rotulo.ufCRM}`;
    }
    return `${rotulo.prefixoCRM || 'Dr.'} CRM/${rotulo.ufCRM} ${rotulo.numeroCRM}`;
  };

  return (
    <Card className="p-3 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(rotulo.id)}
          className="mt-1"
        />
        
        {/* Preview do Rótulo */}
        <div 
          className="flex-1 bg-white border border-border rounded p-2 font-mono text-foreground overflow-hidden"
          style={labelStyle}
        >
          {/* Cabeçalho da Farmácia */}
          <PharmacyHeader config={pharmacyConfig} compact />
          
          {/* Dados da Fórmula */}
          <div className="space-y-0.5">
            {/* Nome da Fórmula */}
            <p className="font-bold text-[9px] leading-tight text-primary">
              {rotulo.formula}
            </p>
            
            {/* Volume */}
            {rotulo.volume && (
              <p className="text-[7px] leading-tight">
                <span className="text-muted-foreground">Vol:</span> {rotulo.volume} {rotulo.unidadeVolume}
              </p>
            )}
            
            {/* Paciente */}
            <p className="text-[7px] leading-tight">
              <span className="text-muted-foreground">Pac:</span> {rotulo.nomePaciente}
            </p>
            
            {/* Médico */}
            {formatarMedico() && (
              <p className="text-[7px] leading-tight">
                <span className="text-muted-foreground">Méd:</span> {formatarMedico()}
              </p>
            )}
            
            {/* Datas e Volume */}
            <div className="flex justify-between text-[6px] leading-tight">
              <span><span className="text-muted-foreground">F:</span> {rotulo.dataFabricacao}</span>
              <span><span className="text-muted-foreground">V:</span> {rotulo.dataValidade}</span>
              {rotulo.volume && (
                <span>{rotulo.volume}{rotulo.unidadeVolume}</span>
              )}
            </div>
            
            {/* Posologia */}
            {rotulo.posologia && (
              <p className="text-[6px] leading-tight border-t border-dashed border-foreground/20 pt-0.5 mt-0.5">
                <span className="text-muted-foreground">Uso:</span> {rotulo.posologia}
              </p>
            )}
            
            {/* Tipo de Uso */}
            {rotulo.tipoUso && (
              <p className="text-[6px] leading-tight font-medium">
                {rotulo.tipoUso}
              </p>
            )}
            
            {/* Lote */}
            {rotulo.lote && (
              <p className="text-[6px] leading-tight">
                <span className="text-muted-foreground">Lote:</span> {rotulo.lote}
              </p>
            )}
            
            {/* Requisição e Registro */}
            <div className="flex justify-between text-[6px] leading-tight border-t border-dashed border-foreground/20 pt-0.5 mt-0.5">
              <span><span className="text-muted-foreground">REQ:</span> {rotulo.nrRequisicao}</span>
              {rotulo.numeroRegistro && (
                <span><span className="text-muted-foreground">REG:</span> {rotulo.numeroRegistro}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LabelCard;
