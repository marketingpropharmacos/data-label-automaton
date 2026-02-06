import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchRequisitionProps {
  onSearch: (requisitionNumber: string) => void;
  isLoading?: boolean;
}

const SearchRequisition = ({ onSearch, isLoading = false }: SearchRequisitionProps) => {
  const [requisitionNumber, setRequisitionNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requisitionNumber.trim()) {
      onSearch(requisitionNumber.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex gap-3 p-1 bg-card rounded-2xl shadow-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Digite o número da requisição..."
            value={requisitionNumber}
            onChange={(e) => setRequisitionNumber(e.target.value)}
            className="pl-12 h-14 text-lg border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          size="lg" 
          className="h-14 px-8 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90"
          disabled={isLoading || !requisitionNumber.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Buscando...
            </>
          ) : (
            "Buscar"
          )}
        </Button>
      </div>
    </form>
  );
};

export default SearchRequisition;
