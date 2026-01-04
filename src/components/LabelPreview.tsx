import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface LabelData {
  id: string;
  productName: string;
  patientName: string;
  requisitionNumber: string;
  date: string;
  quantity?: string;
  doctor?: string;
}

interface LabelPreviewProps {
  label: LabelData;
  selected: boolean;
  onToggle: (id: string) => void;
}

const LabelPreview = ({ label, selected, onToggle }: LabelPreviewProps) => {
  return (
    <Card className="p-4 border-2 border-dashed border-primary/30 bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(label.id)}
          className="mt-1"
        />
        <div className="flex-1 font-mono text-sm space-y-1">
          <div className="flex justify-between items-start">
            <span className="font-bold text-primary text-base">{label.productName}</span>
            <span className="text-xs text-muted-foreground">#{label.requisitionNumber}</span>
          </div>
          <div className="border-t border-dashed border-border pt-2 mt-2">
            <p className="text-foreground"><span className="text-muted-foreground">Paciente:</span> {label.patientName}</p>
            {label.doctor && (
              <p className="text-foreground"><span className="text-muted-foreground">Médico:</span> {label.doctor}</p>
            )}
            <p className="text-foreground"><span className="text-muted-foreground">Data:</span> {label.date}</p>
            {label.quantity && (
              <p className="text-foreground"><span className="text-muted-foreground">Qtd:</span> {label.quantity}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LabelPreview;
