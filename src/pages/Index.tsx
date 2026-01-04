import { useState, useEffect } from "react";
import { Printer, CheckSquare, Square, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchRequisition from "@/components/SearchRequisition";
import LabelPreview from "@/components/LabelPreview";
import { useToast } from "@/hooks/use-toast";
import { getPharmacyConfig, getLabelConfig } from "@/config/api";
import { buscarRequisicao } from "@/services/requisicaoService";
import { Requisicao, PharmacyConfig, LabelConfig } from "@/types/requisicao";

// Dados mockados para demonstração (usado quando servidor não disponível)
const mockRequisicoes: Requisicao[] = [
  {
    id: "1",
    nrRequisicao: "12345",
    nomePaciente: "Maria Silva Santos",
    prefixoCRM: "Dr.",
    numeroCRM: "12345",
    ufCRM: "SP",
    formula: "Cápsula Vitamina D3 5000UI + Vitamina K2 100mcg",
    dataFabricacao: "04/01/2026",
    dataValidade: "04/07/2026",
    numeroRegistro: "REG001",
    posologia: "Tomar 1 cápsula ao dia com as refeições",
    tipoUso: "USO ORAL",
    volume: "60",
    unidadeVolume: " caps",
    observacoes: "",
  },
  {
    id: "2",
    nrRequisicao: "12345",
    nomePaciente: "Maria Silva Santos",
    prefixoCRM: "Dr.",
    numeroCRM: "12345",
    ufCRM: "SP",
    formula: "Creme Hidratante Facial com Ácido Hialurônico 1%",
    dataFabricacao: "04/01/2026",
    dataValidade: "04/04/2026",
    numeroRegistro: "REG002",
    posologia: "Aplicar 2x ao dia no rosto limpo",
    tipoUso: "USO TÓPICO",
    volume: "30",
    unidadeVolume: "g",
    observacoes: "",
  },
];

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [searchedRequisition, setSearchedRequisition] = useState("");
  const [pharmacyConfig, setPharmacyConfig] = useState<PharmacyConfig>(getPharmacyConfig());
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(getLabelConfig());
  const { toast } = useToast();

  // Recarregar configs quando a página recebe foco
  useEffect(() => {
    const handleFocus = () => {
      setPharmacyConfig(getPharmacyConfig());
      setLabelConfig(getLabelConfig());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleSearch = async (requisitionNumber: string) => {
    setIsLoading(true);
    setSearchedRequisition(requisitionNumber);
    
    const result = await buscarRequisicao(requisitionNumber);
    
    if (result.success && result.data) {
      setRequisicoes(result.data);
      setSelectedLabels(new Set(result.data.map(r => r.id)));
      toast({
        title: "Requisição encontrada!",
        description: `${result.data.length} rótulo(s) pronto(s) para impressão.`,
      });
    } else {
      // Fallback para dados mockados se o servidor não estiver disponível
      console.warn("Servidor indisponível, usando dados de demonstração");
      const mockData = mockRequisicoes.map(r => ({ ...r, nrRequisicao: requisitionNumber }));
      setRequisicoes(mockData);
      setSelectedLabels(new Set(mockData.map(r => r.id)));
      toast({
        title: "Modo demonstração",
        description: "Servidor indisponível. Exibindo dados de exemplo.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
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
    setSelectedLabels(new Set(requisicoes.map(r => r.id)));
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
    
    // TODO: Implementar impressão real para Argox
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
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">P</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-primary">{pharmacyConfig.nome}</h1>
                  <p className="text-xs text-muted-foreground">Sistema de Rótulos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Farmácia de Manipulação</span>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/configuracoes">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
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
        {requisicoes.length > 0 && (
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">
                    Rótulos da Requisição #{searchedRequisition}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLabels.size} de {requisicoes.length} selecionados
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Selecionar Todos</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    <Square className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handlePrint}
                    disabled={selectedLabels.size === 0}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requisicoes.map((requisicao) => (
                    <LabelPreview
                      key={requisicao.id}
                      requisicao={requisicao}
                      pharmacyConfig={pharmacyConfig}
                      labelConfig={labelConfig}
                      selected={selectedLabels.has(requisicao.id)}
                      onToggle={toggleLabel}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Empty State */}
        {requisicoes.length === 0 && !isLoading && (
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
          © 2026 {pharmacyConfig.nome} • Sistema de Rótulos Automáticos
        </div>
      </footer>
    </div>
  );
};

export default Index;
