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

  // Extrair aplicação de observações se necessário
  const getAplicacao = (): string => {
    // Se já tem aplicação definida, usa ela
    if (rotulo.aplicacao && rotulo.aplicacao.trim()) {
      return rotulo.aplicacao.trim().toUpperCase();
    }
    
    // Tenta extrair de observações
    const obs = rotulo.observacoes || "";
    const patterns = [
      /APLIC(?:AÇÃO|ACAO)?[:\s]+([^\n,;]+)/i,
      /\b(IV|IM|SC|ID|EV|IDSC|ID\/SC|IM\/SC|SC\/IM)\b/i,
    ];
    
    for (const pattern of patterns) {
      const match = obs.match(pattern);
      if (match) {
        return match[1].trim().toUpperCase();
      }
    }
    
    return "";
  };

  // Remover aplicação de observações se foi extraída
  const getObservacoes = (): string => {
    let obs = rotulo.observacoes || "";
    
    // Se aplicação foi extraída de obs, remove ela
    if (!rotulo.aplicacao || !rotulo.aplicacao.trim()) {
      obs = obs.replace(/APLIC(?:AÇÃO|ACAO)?[:\s]+[^\n,;]+[,;\s]*/gi, "").trim();
    }
    
    return obs;
  };

  const formatarMedico = () => {
    if (!rotulo.numeroCRM) return "";
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
    if (lote.includes('/')) return lote;
    const ano = formatarDataCurta(rotulo.dataFabricacao).split('/')[1] || "";
    return lote ? `${lote}/${ano}` : "";
  };

  // Obter conteúdo do campo
  const getFieldContent = (fieldId: LabelFieldId): React.ReactNode => {
    const config = layoutConfig.campoConfig[fieldId];
    if (!config?.visible) return null;

    const aplicacao = getAplicacao();
    const observacoes = getObservacoes();

    switch (fieldId) {
      case 'paciente':
        return rotulo.nomePaciente || "";
      
      case 'requisicao':
        return `REQ: ${rotulo.nrRequisicao}-${rotulo.nrItem}`;
      
      case 'formula':
        return formatarFormula(rotulo.formula);
      
      case 'lote':
        return `L: ${formatarLote() || "___"}`;
      
      case 'fabricacao':
        return `F: ${formatarDataCurta(rotulo.dataFabricacao)}`;
      
      case 'validade':
        return `V: ${formatarDataCurta(rotulo.dataValidade)}`;
      
      case 'ph':
        return (
          <span className="flex items-center gap-1">
            pH:
            <input
              type="text"
              value={rotulo.ph || ""}
              onChange={(e) => onUpdate?.(rotulo.id, 'ph', e.target.value)}
              placeholder="7.0"
              className="w-10 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary text-center"
              style={{ fontSize: 'inherit' }}
              onClick={(e) => e.stopPropagation()}
            />
          </span>
        );
      
      case 'tipoUso':
        return rotulo.tipoUso?.toUpperCase() || "USO INJETÁVEL";
      
      case 'aplicacao':
        return (
          <span className="flex items-center gap-1">
            APLIC:
            {aplicacao ? (
              <span className="font-medium">{aplicacao}</span>
            ) : (
              <input
                type="text"
                value=""
                onChange={(e) => onUpdate?.(rotulo.id, 'aplicacao', e.target.value)}
                placeholder="ID/SC"
                className="w-12 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary uppercase text-center"
                style={{ fontSize: 'inherit' }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </span>
        );
      
      case 'contem':
        return (
          <span className="flex items-center gap-1">
            CONT:
            <input
              type="text"
              value={rotulo.contem || ""}
              onChange={(e) => onUpdate?.(rotulo.id, 'contem', e.target.value)}
              placeholder="5 FR. DE 2ML"
              className="w-24 bg-muted/50 border-b border-dashed border-foreground/30 px-1 focus:outline-none focus:border-primary uppercase"
              style={{ fontSize: 'inherit' }}
              onClick={(e) => e.stopPropagation()}
            />
          </span>
        );
      
      case 'registro':
        return rotulo.numeroRegistro ? `REG: ${rotulo.numeroRegistro}` : "";
      
      case 'medico':
        return formatarMedico();
      
      case 'posologia':
        return rotulo.posologia ? `Pos: ${rotulo.posologia}` : "";
      
      case 'observacoes':
        return observacoes ? `Obs: ${observacoes}` : "";
      
      default:
        return "";
    }
  };

  // Verificar se campo deve ser renderizado
  const shouldRenderField = (fieldId: LabelFieldId): boolean => {
    const config = layoutConfig.campoConfig[fieldId];
    if (!config?.visible) return false;
    
    const content = getFieldContent(fieldId);
    if (content === "" || content === null) return false;
    
    return true;
  };

  // Obter espaçamento da linha
  const getLineSpacing = (spacing?: string): string => {
    switch (spacing) {
      case 'compact': return 'gap-2';
      case 'wide': return 'gap-4';
      default: return 'gap-3';
    }
  };

  return (
    <Card className="p-4 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-4">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(rotulo.id)}
          className="mt-2"
        />
        
        {/* Preview do Rótulo - Layout em linhas (estilo Word/Excel) */}
        <div 
          className="flex-1 bg-white border border-border rounded overflow-hidden font-mono text-foreground"
          style={{ ...labelStyle, minHeight: '180px' }}
        >
          {/* Cabeçalho da Farmácia - fixo no topo */}
          <PharmacyHeader config={pharmacyConfig} compact />
          
          {/* Área de campos em linhas */}
          <div className="p-2 space-y-1">
            {layoutConfig.linhas.map((linha) => {
              // Filtra campos visíveis e com conteúdo
              const camposVisiveis = linha.campos.filter(shouldRenderField);
              if (camposVisiveis.length === 0) return null;

              return (
                <div 
                  key={linha.id} 
                  className={`flex flex-wrap items-baseline ${getLineSpacing(linha.spacing)}`}
                >
                  {camposVisiveis.map((fieldId) => {
                    const config = layoutConfig.campoConfig[fieldId];
                    const content = getFieldContent(fieldId);
                    
                    return (
                      <span
                        key={fieldId}
                        className={`leading-tight ${config.bold ? 'font-bold' : ''} ${config.uppercase ? 'uppercase' : ''}`}
                        style={{ fontSize: `${config.fontSize}px` }}
                      >
                        {content}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LabelCard;
