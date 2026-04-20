import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RotuloItem } from "@/types/requisicao";
import { CheckCircle2 } from "lucide-react";

interface RequisitionItemSelectorProps {
  rotulos: RotuloItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  savedIds?: Set<string>;
}

/** Extract a short readable label from a rotulo (first active ingredient or formula) */
const shortLabel = (rotulo: RotuloItem): string => {
  const source = (rotulo.composicao || rotulo.formula || "").trim();
  if (!source) return "—";
  // First ingredient before comma/slash
  const first = source.split(/[,/]/)[0].trim();
  const truncated = first.length > 22 ? first.slice(0, 20).trimEnd() + "…" : first;
  return truncated.toUpperCase();
};

const RequisitionItemSelector = ({
  rotulos,
  currentIndex,
  onSelect,
  savedIds,
}: RequisitionItemSelectorProps) => {
  if (!rotulos || rotulos.length <= 1) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          Barras da requisição ({rotulos.length})
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          Clique para saltar direto
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2 px-1 scroll-smooth"
        role="tablist"
        aria-label="Seletor de barras da requisição"
      >
        {rotulos.map((rotulo, idx) => {
          const isActive = idx === currentIndex;
          const itemNumber = rotulo.nrItem || String(idx + 1);
          const saved = savedIds?.has(rotulo.id) ?? false;
          return (
            <Button
              key={rotulo.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(idx)}
              className={cn(
                "shrink-0 h-auto py-1.5 px-3 flex flex-col items-start gap-0.5 min-w-[120px] max-w-[180px]",
                isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
              )}
              title={`Item ${itemNumber} — ${rotulo.formula || rotulo.composicao || ""}`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold opacity-80 w-full">
                <span>#{itemNumber}</span>
                {saved && (
                  <CheckCircle2
                    className={cn(
                      "h-3 w-3",
                      isActive ? "text-primary-foreground" : "text-primary",
                    )}
                    aria-label="Texto salvo"
                  />
                )}
              </span>
              <span className="text-xs font-medium truncate w-full text-left leading-tight">
                {shortLabel(rotulo)}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default RequisitionItemSelector;
