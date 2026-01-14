import { LayoutType } from "@/types/requisicao";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "lucide-react";

interface LayoutSelectorProps {
  value: LayoutType;
  onChange: (value: LayoutType) => void;
}

const layoutOptions: { value: LayoutType; label: string }[] = [
  { value: 'AMP10', label: 'AMP 10' },
  { value: 'AMP_CX', label: 'AMP.CX' },
  { value: 'A_PAC_GRAN', label: 'A.PAC.GRAN' },
  { value: 'TIRZ', label: 'TIRZ' },
];

const LayoutSelector = ({ value, onChange }: LayoutSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Layout className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Layout:</span>
      <Select value={value} onValueChange={(v) => onChange(v as LayoutType)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {layoutOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LayoutSelector;
