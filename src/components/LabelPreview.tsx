import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Requisicao, PharmacyConfig, LabelConfig } from "@/types/requisicao";
import PharmacyHeader from "./PharmacyHeader";

interface LabelPreviewProps {
  requisicao: Requisicao;
  pharmacyConfig: PharmacyConfig;
  labelConfig: LabelConfig;
  selected: boolean;
  onToggle: (id: string) => void;
}

const LabelPreview = ({ requisicao, pharmacyConfig, labelConfig, selected, onToggle }: LabelPreviewProps) => {
  // Converter mm para pixels aproximados (96 DPI / 25.4mm)
  const mmToPx = (mm: number) => Math.round(mm * 3.78);
  
  const labelStyle = {
    width: `${mmToPx(labelConfig.larguraMM)}px`,
    minHeight: `${mmToPx(labelConfig.alturaMM)}px`,
  };

  const formatarMedico = () => {
    if (!requisicao.numeroCRM) return null;
    if (requisicao.nomeMedico) {
      return `${requisicao.prefixoCRM || 'Dr.'} ${requisicao.nomeMedico} - CRM ${requisicao.numeroCRM}/${requisicao.ufCRM}`;
    }
    return `${requisicao.prefixoCRM || 'Dr.'} CRM/${requisicao.ufCRM} ${requisicao.numeroCRM}`;
  };

  return (
    <Card className="p-3 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(requisicao.id)}
          className="mt-1"
        />
        
        {/* Preview do Rótulo */}
        <div 
          className="flex-1 bg-white border border-border rounded p-2 font-mono text-foreground overflow-hidden"
          style={labelStyle}
        >
          {/* Cabeçalho da Farmácia */}
          <PharmacyHeader config={pharmacyConfig} compact />
          
          {/* Dados do Produto */}
          <div className="space-y-0.5">
            {/* Fórmula/Produto */}
            <p className="font-bold text-[9px] leading-tight text-primary line-clamp-2">
              {requisicao.formula}
            </p>
            
            {/* Paciente */}
            <p className="text-[7px] leading-tight">
              <span className="text-muted-foreground">Pac:</span> {requisicao.nomePaciente}
            </p>
            
            {/* Médico */}
            {formatarMedico() && (
              <p className="text-[7px] leading-tight">
                <span className="text-muted-foreground">Méd:</span> {formatarMedico()}
              </p>
            )}
            
            {/* Datas e Volume */}
            <div className="flex justify-between text-[6px] leading-tight">
              <span><span className="text-muted-foreground">F:</span> {requisicao.dataFabricacao}</span>
              <span><span className="text-muted-foreground">V:</span> {requisicao.dataValidade}</span>
              {requisicao.volume && (
                <span>{requisicao.volume}{requisicao.unidadeVolume}</span>
              )}
            </div>
            
            {/* Posologia */}
            {requisicao.posologia && (
              <p className="text-[6px] leading-tight border-t border-dashed border-foreground/20 pt-0.5 mt-0.5">
                <span className="text-muted-foreground">Uso:</span> {requisicao.posologia}
              </p>
            )}
            
            {/* Tipo de Uso */}
            {requisicao.tipoUso && (
              <p className="text-[6px] leading-tight font-medium">
                {requisicao.tipoUso}
              </p>
            )}
            
            {/* Requisição e Registro */}
            <div className="flex justify-between text-[6px] leading-tight border-t border-dashed border-foreground/20 pt-0.5 mt-0.5">
              <span><span className="text-muted-foreground">REQ:</span> {requisicao.nrRequisicao}</span>
              {requisicao.numeroRegistro && (
                <span><span className="text-muted-foreground">REG:</span> {requisicao.numeroRegistro}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LabelPreview;
