import { useState } from "react";
import { Printer, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchRequisition from "@/components/SearchRequisition";
import LabelPreview from "@/components/LabelPreview";
import { useToast } from "@/hooks/use-toast";

// Dados mockados para demonstração (será substituído pela busca real no banco)
const mockLabels = [
  {
    id: "1",
    productName: "Cápsula Vitamina D3 5000UI",
    patientName: "Maria Silva Santos",
    requisitionNumber: "12345",
    date: "04/01/2026",
    quantity: "60 cápsulas",
    doctor: "Dr. João Pereira",
  },
  {
    id: "2",
    productName: "Creme Hidratante Facial 30g",
    patientName: "Maria Silva Santos",
    requisitionNumber: "12345",
    date: "04/01/2026",
    quantity: "1 pote",
    doctor: "Dr. João Pereira",
  },
  {
    id: "3",
    productName: "Solução Capilar 100ml",
    patientName: "Maria Silva Santos",
    requisitionNumber: "12345",
    date: "04/01/2026",
    quantity: "1 frasco",
    doctor: "Dr. João Pereira",
  },
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [labels, setLabels] = useState<typeof mockLabels>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [searchedRequisition, setSearchedRequisition] = useState("");
  const { toast } = useToast();

  const handleSearch = async (requisitionNumber: string) => {
    setIsLoading(true);
    setSearchedRequisition(requisitionNumber);
    
    // Simula busca no banco (será substituído pela chamada real)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Por enquanto, retorna dados mockados
    setLabels(mockLabels.map(label => ({ ...label, requisitionNumber })));
    setSelectedLabels(new Set(mockLabels.map(l => l.id)));
    setIsLoading(false);
    
    toast({
      title: "Requisição encontrada!",
      description: `${mockLabels.length} rótulos prontos para impressão.`,
    });
  };

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedLabels(new Set(labels.map(l => l.id)));
  };

  const deselectAll = () => {
    setSelectedLabels(new Set());
  };

  const handlePrint = () => {
    const selectedCount = selectedLabels.size;
    if (selectedCount === 0) {
      toast({
        title: "Nenhum rótulo selecionado",
        description: "Selecione pelo menos um rótulo para imprimir.",
        variant: "destructive",
      });
      return;
    }
    
    // TODO: Implementar impressão real
    toast({
      title: "Imprimindo...",
      description: `${selectedCount} rótulo(s) enviado(s) para a impressora Argox.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Pró */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">P</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-primary">Pró Pharmaços</h1>
                  <p className="text-xs text-muted-foreground">Sistema de Rótulos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Farmácia de Manipulação</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Gerador de Rótulos
            </h2>
            <p className="text-muted-foreground text-lg">
              Digite o número da requisição para gerar os rótulos automaticamente
            </p>
          </div>
          <SearchRequisition onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Labels Section */}
        {labels.length > 0 && (
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">
                    Rótulos da Requisição #{searchedRequisition}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLabels.size} de {labels.length} selecionados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Selecionar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    <Square className="h-4 w-4 mr-1" />
                    Limpar Seleção
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handlePrint}
                    disabled={selectedLabels.size === 0}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir Selecionados
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {labels.map((label) => (
                    <LabelPreview
                      key={label.id}
                      label={label}
                      selected={selectedLabels.has(label.id)}
                      onToggle={toggleLabel}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Empty State */}
        {labels.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
              <Printer className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma requisição buscada
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Digite o número de uma requisição no campo acima para visualizar e imprimir os rótulos dos produtos.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          © 2026 Pró Pharmaços • Sistema de Rótulos Automáticos
        </div>
      </footer>
    </div>
  );
};

export default Index;
