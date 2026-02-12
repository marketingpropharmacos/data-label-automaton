import { useState, useEffect } from "react";
import { Printer, Settings, LogOut, ListOrdered } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SearchRequisition from "@/components/SearchRequisition";
import LabelTextEditor from "@/components/LabelTextEditor";
import LayoutSelector from "@/components/LayoutSelector";
import LayoutEditor from "@/components/LayoutEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPharmacyConfig, getLabelConfig, getPrinterConfig, getPrintAgentConfig } from "@/config/api";
import { getLayout, getSelectedLayout, setSelectedLayout, resetAllLayouts } from "@/config/layouts";
import { buscarRequisicao, imprimirRotulos } from "@/services/requisicaoService";
import { imprimirViaAgente } from "@/services/printAgentService";
import { RotuloItem, PharmacyConfig, LabelConfig, LayoutType, LayoutConfig } from "@/types/requisicao";
import { listarImpressoras } from "@/services/printAgentService";
import logoProPharmacos from "@/assets/logo-propharmacos.png";
import { Edit } from "lucide-react";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [rotulos, setRotulos] = useState<RotuloItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchedRequisition, setSearchedRequisition] = useState("");
  const [pharmacyConfig, setPharmacyConfig] = useState<PharmacyConfig>(getPharmacyConfig());
  const [labelConfig, setLabelConfig] = useState<LabelConfig>(getLabelConfig());
  const [layoutType, setLayoutType] = useState<LayoutType>(getSelectedLayout());
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(getLayout(layoutType));
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const { toast } = useToast();
  const { isAdmin, signOut, user } = useAuth();

  // Carregar impressoras do agente
  useEffect(() => {
    const agentConfig = getPrintAgentConfig();
    if (agentConfig.enabled && agentConfig.agentUrl) {
      setSelectedPrinter(agentConfig.impressora || "");
      listarImpressoras(agentConfig.agentUrl).then(result => {
        if (result.success && result.data) {
          setAvailablePrinters(result.data.impressoras);
        }
      });
    }
  }, []);

  // Resetar layouts ao inicializar
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

  const handleLayoutChange = (newType: LayoutType) => {
    setLayoutType(newType);
    setSelectedLayout(newType);
    setLayoutConfig(getLayout(newType));
  };

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
      setCurrentIndex(0);
      toast({
        title: "Requisição encontrada!",
        description: `${result.data.length} rótulo(s) carregado(s).`,
      });
    } else {
      setRotulos([]);
      setCurrentIndex(0);
      toast({
        title: "Requisição não encontrada",
        description: result.error || "Verifique o número e tente novamente.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleTextChange = (id: string, text: string) => {
    setRotulos(prev => prev.map(r => r.id === id ? { ...r, textoLivre: text } : r));
  };

  const handlePrint = async () => {
    if (rotulos.length === 0) return;

    setIsPrinting(true);
    
    const rotuloAtual = rotulos[currentIndex];
    const rotulosSelecionados = [rotuloAtual];
    
    const farmaciaData = {
      nome: pharmacyConfig.nome,
      farmaceutico: pharmacyConfig.farmaceutico,
      crf: pharmacyConfig.crf,
    };

    const agentConfig = getPrintAgentConfig();
    let result;
    
    if (agentConfig.enabled) {
      const configComImpressora = { ...agentConfig, impressora: selectedPrinter || agentConfig.impressora };
      result = await imprimirViaAgente(configComImpressora, rotulosSelecionados, layoutType, farmaciaData);
    } else {
      const printerConfig = getPrinterConfig();
      const caminho = `\\\\${printerConfig.nomePC}\\${printerConfig.nomeCompartilhamento}`;
      result = await imprimirRotulos(caminho, rotulosSelecionados, layoutType, farmaciaData);
    }
    
    setIsPrinting(false);
    
    if (result.success) {
      toast({
        title: "Impressão concluída!",
        description: `Rótulo ${currentIndex + 1}/${rotulos.length} enviado para a impressora.`,
      });
    } else {
      toast({
        title: "Erro na impressão",
        description: result.error || "Não foi possível imprimir o rótulo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-card via-card to-accent/30 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoProPharmacos} alt="ProPharmacos" className="h-12 w-auto" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">Sistema de Rótulos</h1>
                <p className="text-xs text-muted-foreground">Farmácia de Manipulação</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
              <Button variant="outline" size="icon" className="border-primary/20 hover:bg-accent" asChild>
                <Link to="/fila"><ListOrdered className="h-5 w-5 text-primary" /></Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="icon" className="border-primary/20 hover:bg-accent" asChild>
                  <Link to="/configuracoes"><Settings className="h-5 w-5 text-primary" /></Link>
                </Button>
              )}
              <Button variant="outline" size="icon" className="border-primary/20 hover:bg-accent" onClick={signOut} title="Sair">
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-foreground mb-2">Gerador de Rótulos</h2>
            <p className="text-muted-foreground text-lg">
              Digite o número da requisição para gerar os rótulos automaticamente
            </p>
          </div>
          <SearchRequisition onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Layout selector (only when rotulos loaded) */}
        {rotulos.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <LayoutSelector value={layoutType} onChange={handleLayoutChange} />
            <Button variant="ghost" size="icon" onClick={() => setEditorOpen(true)} title="Editar layout">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Editor */}
        {rotulos.length > 0 && (
          <LabelTextEditor
            rotulos={rotulos}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onTextChange={handleTextChange}
            layoutConfig={layoutConfig}
            layoutType={layoutType}
            pharmacyConfig={pharmacyConfig}
            searchedRequisition={searchedRequisition}
            onPrint={handlePrint}
            isPrinting={isPrinting}
            availablePrinters={availablePrinters}
            selectedPrinter={selectedPrinter}
            onPrinterChange={setSelectedPrinter}
          />
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
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma requisição buscada</h3>
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
