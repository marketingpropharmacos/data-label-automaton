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
  onUpdate?: (id: string, field: string, value: string) => void;
}

const LabelCard = ({ rotulo, pharmacyConfig, labelConfig, selected, onToggle, onUpdate }: LabelCardProps) => {
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

  return (
    <Card className="p-4 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(rotulo.id)}
          className="mt-2"
        />
        
        {/* Preview do Rótulo - Layout baseado no modelo */}
        <div 
          className="flex-1 bg-white border border-border rounded p-3 font-mono text-foreground overflow-hidden"
          style={labelStyle}
        >
          {/* Cabeçalho da Farmácia */}
          <PharmacyHeader config={pharmacyConfig} compact />
          
          {/* Linha 1: Paciente + REQ */}
          <div className="flex justify-between items-start mt-2">
            <p className="font-bold text-[11px] leading-tight text-foreground uppercase">
              {rotulo.nomePaciente}
            </p>
            <p className="text-[10px] leading-tight font-medium">
              REQ:{rotulo.nrRequisicao}-{rotulo.nrItem}
            </p>
          </div>
          
          {/* Linha 2: Fórmula (sem prefixo AMP) */}
          <p className="font-bold text-[11px] leading-tight text-primary mt-1 uppercase">
            {formatarFormula(rotulo.formula)}
          </p>
          
          {/* Linha 3: Lote, Fabricação, Validade, pH */}
          <div className="flex gap-3 text-[10px] leading-tight mt-2 items-center">
            <span>L:{formatarLote() || "___"}</span>
            <span>F:{formatarDataCurta(rotulo.dataFabricacao)}</span>
            <span>V:{formatarDataCurta(rotulo.dataValidade)}</span>
            <span className="flex items-center">
              pH:
              <input
                type="text"
                value={rotulo.ph || ""}
                onChange={(e) => onUpdate?.(rotulo.id, 'ph', e.target.value)}
                placeholder="7.0"
                className="ml-1 w-10 bg-muted/50 border-b border-dashed border-foreground/30 text-[10px] px-1 focus:outline-none focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </span>
          </div>
          
          {/* Linha 4: Quantidade */}
          {rotulo.quantidade && (
            <p className="text-[10px] leading-tight mt-1 font-medium">
              {rotulo.quantidade}
            </p>
          )}
          
          {/* Linha 5: Tipo de Uso + Aplicação */}
          <div className="flex justify-between text-[10px] leading-tight mt-1">
            <span className="uppercase">{rotulo.tipoUso || "USO"}</span>
            <span className="font-medium">
              APLICAÇÃO:
              <input
                type="text"
                value={rotulo.aplicacao || ""}
                onChange={(e) => onUpdate?.(rotulo.id, 'aplicacao', e.target.value)}
                placeholder="ID/SC"
                className="ml-1 w-16 bg-muted/50 border-b border-dashed border-foreground/30 text-[10px] px-1 focus:outline-none focus:border-primary uppercase"
                onClick={(e) => e.stopPropagation()}
              />
            </span>
          </div>
          
          {/* Linha 6: Contém + REG */}
          <div className="flex justify-between text-[10px] leading-tight mt-1">
            <span>
              CONTÉM:
              <input
                type="text"
                value={rotulo.contem || ""}
                onChange={(e) => onUpdate?.(rotulo.id, 'contem', e.target.value)}
                placeholder="5 FR. DE 2ML"
                className="ml-1 w-24 bg-muted/50 border-b border-dashed border-foreground/30 text-[10px] px-1 focus:outline-none focus:border-primary uppercase"
                onClick={(e) => e.stopPropagation()}
              />
            </span>
            {rotulo.numeroRegistro && (
              <span>REG:{rotulo.numeroRegistro}</span>
            )}
          </div>
          
          {/* Linha 6: Médico */}
          {formatarMedico() && (
            <p className="text-[10px] leading-tight mt-2 uppercase">
              {formatarMedico()}
            </p>
          )}
          
          {/* Posologia se houver */}
          {rotulo.posologia && (
            <p className="text-[9px] leading-tight border-t border-dashed border-foreground/20 pt-1 mt-2">
              <span className="text-muted-foreground">Posologia:</span> {rotulo.posologia}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LabelCard;
