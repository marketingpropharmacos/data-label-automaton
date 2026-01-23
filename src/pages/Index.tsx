import { useState, useEffect } from "react";
import { Printer, CheckSquare, Square, Settings, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SearchRequisition from "@/components/SearchRequisition";
import LabelCard from "@/components/LabelCard";
import LayoutSelector from "@/components/LayoutSelector";
import LayoutEditor from "@/components/LayoutEditor";
import { useToast } from "@/hooks/use-toast";
import { getPharmacyConfig, getLabelConfig, getPrinterConfig, getPrintAgentConfig } from "@/config/api";
import { getLayout, getSelectedLayout, setSelectedLayout, resetAllLayouts } from "@/config/layouts";
import { buscarRequisicao, imprimirRotulos } from "@/services/requisicaoService";
import { imprimirViaAgente } from "@/services/printAgentService";
import { RotuloItem, PharmacyConfig, LabelConfig, LayoutType, LayoutConfig } from "@/types/requisicao";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [rotulos, setRotulos] = useState<RotuloItem[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [searchedRequisition, setSearchedRequisition] = useState("");
  const [pharmacyConfig, setPharmacyConfig] = useState<PharmacyConfig>(getPharmacyConfig());
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(getLabelConfig());
  const [layoutType, setLayoutType] = useState<LayoutType>(getSelectedLayout());
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(getLayout(layoutType));
  const [editorOpen, setEditorOpen] = useState(false);
  const { toast } = useToast();

  // Resetar layouts ao inicializar para aplicar mudanças recentes
  useEffect(() => {
    resetAllLayouts();
    setLayoutConfig(getLayout(layoutType));
  }, []);

  // Recarregar configs quando a página recebe foco
  useEffect(() => {
    const handleFocus = () => {
      setPharmacyConfig(getPharmacyConfig());
      setLabelConfig(getLabelConfig());
      setLayoutConfig(getLayout(layoutType));
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [layoutType]);

  // Atualizar layout quando o tipo muda
  const handleLayoutChange = (newType: LayoutType) => {
    setLayoutType(newType);
    setSelectedLayout(newType);
    setLayoutConfig(getLayout(newType));
  };

  // Salvar layout editado
  const handleLayoutEditorSave = (newLayout: LayoutConfig) => {
    setLayoutConfig(newLayout);
    setEditorOpen(false);
  };

  const handleSearch = async (requisitionNumber: string) => {
    setIsLoading(true);
    setSearchedRequisition(requisitionNumber);
    
    const result = await buscarRequisicao(requisitionNumber);
    
    if (result.success && result.data && result.data.length > 0) {
      setRotulos(result.data);
      setSelectedLabels(new Set(result.data.map(r => r.id)));
      toast({
        title: "Requisição encontrada!",
        description: `${result.data.length} rótulo(s) pronto(s) para impressão.`,
      });
    } else {
      setRotulos([]);
      setSelectedLabels(new Set());
      toast({
        title: "Requisição não encontrada",
        description: result.error || "Verifique o número e tente novamente.",
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

  const updateRotulo = (id: string, field: string, value: string) => {
    setRotulos(prev => prev.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const selectAll = () => {
    setSelectedLabels(new Set(rotulos.map(r => r.id)));
  };

  const deselectAll = () => {
    setSelectedLabels(new Set());
  };

  const handlePrint = async () => {
    const selectedCount = selectedLabels.size;
    if (selectedCount === 0) {
      toast({
        title: "Nenhum rótulo selecionado",
        description: "Selecione pelo menos um rótulo para imprimir.",
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);
    
    // Filtra apenas os rótulos selecionados
    const rotulosSelecionados = rotulos.filter(r => selectedLabels.has(r.id));
    
    // Dados da farmácia
    const farmaciaData = {
      nome: pharmacyConfig.nome,
      farmaceutico: pharmacyConfig.farmaceutico,
      crf: pharmacyConfig.crf,
    };

    // Verifica se deve usar o agente HTTP
    const agentConfig = getPrintAgentConfig();
    
    let result;
    
    if (agentConfig.enabled) {
      // Usa agente HTTP local
      result = await imprimirViaAgente(
        agentConfig,
        rotulosSelecionados,
        layoutType,
        farmaciaData
      );
    } else {
      // Usa servidor Flask via compartilhamento
      const printerConfig = getPrinterConfig();
      const caminho = `\\\\${printerConfig.nomePC}\\${printerConfig.nomeCompartilhamento}`;
      
      result = await imprimirRotulos(
        caminho,
        rotulosSelecionados,
        layoutType,
        farmaciaData
      );
    }
    
    setIsPrinting(false);
    
    if (result.success) {
      toast({
        title: "Impressão concluída!",
        description: `${result.data?.impressos || selectedCount} rótulo(s) enviado(s) para a impressora.`,
      });
    } else {
      toast({
        title: "Erro na impressão",
        description: result.error || "Não foi possível imprimir os rótulos.",
        variant: "destructive",
      });
    }
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
        {rotulos.length > 0 && (
          <section>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-xl">
                    Rótulos da Requisição #{searchedRequisition}
                  </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedLabels.size} de {rotulos.length} selecionados
                    </p>
                    <div className="flex items-center gap-2">
                      <LayoutSelector value={layoutType} onChange={handleLayoutChange} />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditorOpen(true)}
                        title="Editar layout"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                    disabled={selectedLabels.size === 0 || isPrinting}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Printer className={`h-4 w-4 mr-1 ${isPrinting ? 'animate-pulse' : ''}`} />
                    {isPrinting ? 'Imprimindo...' : 'Imprimir'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rotulos.map((rotulo) => (
                    <LabelCard
                      key={rotulo.id}
                      rotulo={rotulo}
                      pharmacyConfig={pharmacyConfig}
                      labelConfig={labelConfig}
                      layoutConfig={layoutConfig}
                      selected={selectedLabels.has(rotulo.id)}
                      onToggle={toggleLabel}
                      onUpdate={updateRotulo}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Layout Editor Dialog */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Layout: {layoutConfig.nome}</DialogTitle>
              <DialogDescription>
                Arraste os campos para reposicioná-los ou use os controles para ajustar
              </DialogDescription>
            </DialogHeader>
            <LayoutEditor 
              layout={layoutConfig} 
              onSave={handleLayoutEditorSave}
              onClose={() => setEditorOpen(false)}
              previewData={rotulos.length > 0 ? rotulos[0] : undefined}
              pharmacyConfig={pharmacyConfig}
              labelConfig={labelConfig}
            />
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {rotulos.length === 0 && !isLoading && (
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
