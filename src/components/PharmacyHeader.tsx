import { PharmacyConfig } from "@/types/requisicao";

interface PharmacyHeaderProps {
  config: PharmacyConfig;
  compact?: boolean;
}

const PharmacyHeader = ({ config, compact = false }: PharmacyHeaderProps) => {
  if (compact) {
    return (
      <div className="text-center border-b border-dashed border-foreground/30 pb-1 mb-1">
        <p className="font-bold text-[8px] leading-tight">{config.nome}</p>
        <p className="text-[6px] leading-tight">{config.telefone}</p>
      </div>
    );
  }

  return (
    <div className="text-center border-b-2 border-dashed border-foreground/30 pb-2 mb-2">
      <h3 className="font-bold text-sm leading-tight">{config.nome}</h3>
      <p className="text-[10px] leading-tight">{config.endereco}</p>
      <p className="text-[10px] leading-tight">Tel: {config.telefone} • CNPJ: {config.cnpj}</p>
      <p className="text-[10px] leading-tight font-medium">
        {config.farmaceutico} - {config.crf}
      </p>
    </div>
  );
};

export default PharmacyHeader;
