import { useState, useEffect } from "react";
import { Printer, Settings, LogOut, ListOrdered, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import SearchRequisition from "@/components/SearchRequisition";
import LabelTextEditor from "@/components/LabelTextEditor";
import LayoutSelector from "@/components/LayoutSelector";
import LayoutEditor from "@/components/LayoutEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPharmacyConfig, getPrintAgentConfig, getApiConfig, getModoImpressao, setModoImpressao, ModoImpressao, getLayoutPrinter, setLayoutPrinter, getLayoutStation, setActiveStationId, getActiveStation, getPrintStations } from "@/config/api";
import { getLayout, getSelectedLayout, setSelectedLayout, resetAllLayouts } from "@/config/layouts";
import { buscarRequisicao } from "@/services/requisicaoService";
import { imprimirViaAgente, imprimirViaRotutx, imprimirViaRotutxRaw } from "@/services/printAgentService";
import { RotuloItem, PharmacyConfig, LayoutType, LayoutConfig } from "@/types/requisicao";
import { listarImpressoras } from "@/services/printAgentService";
import { supabase } from "@/integrations/supabase/client";

import logoProPharmacos from "@/assets/logo-propharmacos.png";
import { Edit } from "lucide-react";

const padReqNumber = (value: string) => value.trim().padStart(6, "0");

const isAmp10SavedTextValid = (textoLivre: string, rotulo: RotuloItem): boolean => {
  const lines = textoLivre
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length < 5 || lines.length > 10) return false;
  if (!lines.every((line) => line.startsWith("   "))) return false;

  const reqToken = `REQ:${padReqNumber(rotulo.nrRequisicao || "")}-${rotulo.nrItem || "0"}`;
  if (!lines[0]?.includes(reqToken) || /REQ:\s*$/.test(lines[0])) return false;
  if (!lines[1]?.includes("DR(A)")) return false;

  if (rotulo.numeroCRM && !lines[1].includes(String(rotulo.numeroCRM))) return false;
  if (rotulo.ufCRM && !lines[1].toUpperCase().includes(String(rotulo.ufCRM).toUpperCase())) return false;

  const usoLine = lines.find((line) => line.includes("USO"));
  const contemLine = lines.find((line) => line.includes("CONTEM:"));
  if (!usoLine || !contemLine) return false;
  if (contemLine.includes("REG:")) return false;

  if (rotulo.aplicacao) {
    const apToken = `AP:${String(rotulo.aplicacao).trim().toUpperCase()}`;
    if (!usoLine.toUpperCase().includes(apToken)) return false;
  }

  if (rotulo.numeroRegistro) {
    const regToken = `REG:${rotulo.numeroRegistro}`;
    if (!usoLine.includes(regToken) || /REG:\s*$/.test(usoLine)) return false;
  }

  return true;
};

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [rotulos, setRotulos] = useState<RotuloItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchedRequisition, setSearchedRequisition] = useState("");
  const [pharmacyConfig, setPharmacyConfig] = useState<PharmacyConfig>(getPharmacyConfig());
  
  const [layoutType, setLayoutType] = useState<LayoutType>(getSelectedLayout());
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(getLayout(layoutType));
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [modoImpressao, setModoImpressaoState] = useState<ModoImpressao>(getModoImpressao());
  const { toast } = useToast();
  const { isAdmin, signOut, user } = useAuth();

  const handleModoChange = (checked: boolean) => {
    const modo: ModoImpressao = checked ? 'rotutx' : 'agente';
    setModoImpressaoState(modo);
    setModoImpressao(modo);
    toast({
      title: modo === 'rotutx' ? "Modo FC (direto)" : "Modo Agente",
      description: modo === 'rotutx'
        ? "Usando bytes do Fórmula Certa — layout garantido."
        : "Gerando PPLA pelo agente local.",
    });
  };

  // Sincronizar layout, estação e impressora sempre que o layout mudar
  useEffect(() => {
    let cancelled = false;

    const syncLayoutDependencies = async () => {
      setLayoutConfig(getLayout(layoutType));

      const agentConfig = getPrintAgentConfig();
      if (!agentConfig.enabled) return;

      const mappedPrinter = getLayoutPrinter(layoutType) || "";
      if (mappedPrinter) {
        setSelectedPrinter(mappedPrinter);
        setAvailablePrinters((prev) =>
          prev.includes(mappedPrinter) ? prev : [mappedPrinter, ...prev]
        );
      }

      const mappedStationId = getLayoutStation(layoutType);
      if (mappedStationId) {
        setActiveStationId(mappedStationId);
      }

      const station = mappedStationId
        ? getPrintStations().find((item) => item.id === mappedStationId)
        : getActiveStation();

      if (!station?.agentUrl) {
        if (!cancelled) {
          setAvailablePrinters(mappedPrinter ? [mappedPrinter] : []);
        }
        return;
      }

      const result = await listarImpressoras(station.agentUrl);
      if (cancelled) return;

      if (result.success && result.data) {
        const printers = result.data.impressoras || [];
        const mergedPrinters = mappedPrinter && !printers.includes(mappedPrinter)
          ? [mappedPrinter, ...printers]
          : printers;

        setAvailablePrinters(mergedPrinters);

        if (!mappedPrinter && result.data.padrao) {
          setSelectedPrinter(result.data.padrao);
        }
      } else {
        setAvailablePrinters(mappedPrinter ? [mappedPrinter] : []);
      }
    };

    syncLayoutDependencies();

    return () => {
      cancelled = true;
    };
  }, [layoutType]);

  // Recarregar configs quando a página recebe foco
  useEffect(() => {
    const handleFocus = () => {
      setPharmacyConfig(getPharmacyConfig());
      setLayoutConfig(getLayout(layoutType));
      setSelectedPrinter(getLayoutPrinter(layoutType) || "");
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [layoutType]);

  const handleLayoutChange = (newType: LayoutType) => {
    setLayoutType(newType);
    setSelectedLayout(newType);
    setLayoutConfig(getLayout(newType));
    // Tentar restaurar textoLivre salvo para o novo layout
    if (rotulos.length > 0 && searchedRequisition) {
      const canonicalReq = rotulos[0]?.nrRequisicao?.trim() || searchedRequisition;
      supabase
        .from('saved_rotulos')
        .select('item_id, texto_livre')
        .eq('nr_requisicao', canonicalReq)
        .eq('layout_type', newType)
        .then(({ data: savedRows }) => {
          if (savedRows && savedRows.length > 0) {
            const savedMap: Record<string, string> = {};
            savedRows.forEach(row => { savedMap[row.item_id] = row.texto_livre; });
            setRotulos(prev => prev.map(r => {
              const saved = savedMap[r.id];
              return { ...r, textoLivre: saved ?? undefined };
            }));
          } else {
            setRotulos(prev => prev.map(r => ({ ...r, textoLivre: undefined })));
          }
        });
    } else {
      setRotulos(prev => prev.map(r => ({ ...r, textoLivre: undefined })));
    }
  };

  const handleLayoutEditorSave = (newLayout: LayoutConfig) => {
    setLayoutConfig(newLayout);
    setRotulos(prev => prev.map(r => ({ ...r, textoLivre: undefined })));
    setEditorOpen(false);
  };

  const handleSearch = async (requisitionNumber: string) => {
    setIsLoading(true);
    setSearchedRequisition(requisitionNumber);
    
    const result = await buscarRequisicao(requisitionNumber);
    
    if (result.success && result.data && result.data.length > 0) {
      // Restaurar edições salvas do Supabase (somente se compatível com layout atual)
      let restoredRotulos = result.data;
      try {
        // Usar o nrRequisicao canônico dos dados (não o input do usuário)
        // para garantir que a busca salva/restaura usa o mesmo formato
        const canonicalReq = result.data![0]?.nrRequisicao?.trim() || requisitionNumber;
        console.log('[Restore] Buscando saved_rotulos para req:', canonicalReq, '(input:', requisitionNumber, ')');
        const { data: savedRows } = await supabase
          .from('saved_rotulos')
          .select('item_id, texto_livre, layout_type')
          .eq('nr_requisicao', canonicalReq)
          .eq('layout_type', layoutType);
        
        console.log('[Restore] savedRows encontrados:', savedRows?.length || 0, savedRows?.map(r => r.item_id));
        console.log('[Restore] rotulo IDs do backend:', result.data!.map(r => r.id));

        if (savedRows && savedRows.length > 0) {
          const savedMap: Record<string, string> = {};
          const rotuloById = new Map(result.data.map((rotulo) => [rotulo.id, rotulo]));
          savedRows.forEach(row => {
            const rotulo = rotuloById.get(row.item_id);
            if (!rotulo) {
              console.warn('[Restore] item_id NÃO encontrado nos rótulos:', row.item_id);
              return;
            }

            // Confiança total no texto salvo para todos os layouts (WYSIWYG — operador decide o conteúdo)
            savedMap[row.item_id] = row.texto_livre;
          });
          restoredRotulos = result.data.map(r => {
            const savedText = savedMap[r.id];
            return savedText ? { ...r, textoLivre: savedText } : r;
          });
        }
      } catch (err) {
        console.error('[Restore] Erro ao restaurar saved_rotulos:', err);
      }

      setRotulos(restoredRotulos);
      setCurrentIndex(0);
      const hasSaved = restoredRotulos.some((r, i) => r.textoLivre !== result.data![i].textoLivre);
      toast({
        title: "Requisição encontrada!",
        description: `${restoredRotulos.length} rótulo(s) carregado(s).${hasSaved ? ' Edições salvas restauradas.' : ''}`,
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

  const handleTextChange = (id: string, text: string | undefined) => {
    setRotulos(prev => prev.map(r => r.id === id ? { ...r, textoLivre: text } : r));
  };

  const handlePrint = async (quantity: number = 1) => {
    if (rotulos.length === 0) return;
    setIsPrinting(true);
    const rotuloAtual = rotulos[currentIndex];
    const rotulosSelecionados = Array.from({ length: quantity }, () => ({ ...rotuloAtual }));
    await executePrint(rotulosSelecionados);
  };

  const handlePrintAll = async (quantity: number = 1) => {
    if (rotulos.length === 0) return;
    setIsPrinting(true);
    const rotulosSelecionados = rotulos.flatMap(r =>
      Array.from({ length: quantity }, () => ({ ...r }))
    );
    await executePrint(rotulosSelecionados);
  };

  const executePrint = async (rotulosSelecionados: RotuloItem[]) => {
    const farmaciaData = {
      nome: pharmacyConfig.nome,
      farmaceutico: pharmacyConfig.farmaceutico,
      crf: pharmacyConfig.crf,
    };

    const agentConfig = getPrintAgentConfig();
    const apiConfig = getApiConfig();
    
    // Resolver estação automaticamente pelo layout (prioridade) ou fallback para ativa
    const layoutStationId = getLayoutStation(layoutType);
    const stations = getPrintStations();
    const station = (layoutStationId ? stations.find(s => s.id === layoutStationId) : null) || getActiveStation();
    const agentUrl = station?.agentUrl || "";
    const impressora = selectedPrinter || getLayoutPrinter(layoutType) || "";
    
    // Usar calibração do agente sem sobrescrever fonte/rotação por definição de layout
    const calibracaoPadrao = agentConfig.calibracao || {
      margem_c: 0,
      offset_r: -500,
      contraste: 14,
      fonte: 2,
      rotacao: 0,
      modo: 'dots',
    };
    
    let result;

    // A_PAC_PEQ usa sempre Agente (textoLivre WYSIWYG não funciona em ROTUTX)
    const effectiveModo = (layoutType === 'A_PAC_PEQ' || layoutType === 'A_PAC_GRAN') ? 'agente' : modoImpressao;

    // Modo ROTUTX: usar bytes do Fórmula Certa direto
    if (effectiveModo === 'rotutx' && agentConfig.enabled && agentUrl) {
      // Imprimir cada rótulo via ROTUTX
      let sucessos = 0;
      let erros: string[] = [];
      
      for (const rotulo of rotulosSelecionados) {
        const rotutxResult = await imprimirViaRotutx(
          apiConfig.serverUrl,
          rotulo.nrRequisicao,
          apiConfig.codigoFilial,
          "1", // série padrão
          rotulo.nrItem,
          impressora,
          agentUrl,
          calibracaoPadrao
        );
        
        if (rotutxResult.success) {
          sucessos++;
        } else if (rotutxResult.error === "ROTUTX_NOT_FOUND") {
          toast({
            title: "ROTUTX não encontrado",
            description: `Item ${rotulo.nrItem}: usando modo agente como fallback.`,
          });
          const configComImpressora = { ...agentConfig, agentUrl, impressora, calibracao: calibracaoPadrao };
          const fallback = await imprimirViaAgente(configComImpressora, [rotulo], layoutType, farmaciaData);
          if (fallback.success) sucessos++;
          else erros.push(`Item ${rotulo.nrItem}: ${fallback.error}`);
        } else {
          erros.push(`Item ${rotulo.nrItem}: ${rotutxResult.error}`);
        }
      }

      result = {
        success: erros.length === 0,
        error: erros.length > 0 ? erros.join("; ") : undefined,
        data: { impressos: sucessos },
      };
    } else if (agentConfig.enabled && agentUrl) {
      // Modo Agente — envia dados para o agente Python gerar e imprimir
      const configComImpressora = { ...agentConfig, agentUrl, impressora, calibracao: calibracaoPadrao };
      result = await imprimirViaAgente(configComImpressora, rotulosSelecionados, layoutType, farmaciaData);
    } else {
      // Sem URL de estação configurada
      const stationName = station?.nome || layoutStationId || 'desconhecida';
      result = { success: false, error: `Estação "${stationName}" sem URL ngrok configurada. Vá em Configurações → Agente HTTP e preencha a URL da estação.` };
    }
    
    setIsPrinting(false);
    
    if (result.success) {
      toast({
        title: "Impressão concluída!",
        description: `${rotulosSelecionados.length} rótulo(s) enviado(s) para a impressora.`,
      });
    } else {
      toast({
        title: "Erro na impressão",
        description: result.error || "Não foi possível imprimir o rótulo.",
        variant: "destructive",
      });
    }
  };

  const handlePrintFcRaw = async () => {
    if (rotulos.length === 0 || !searchedRequisition) {
      toast({ title: "Sem requisição", description: "Busque uma requisição primeiro.", variant: "destructive" });
      return;
    }
    setIsPrinting(true);
    const apiConfig = getApiConfig();
    const station = getActiveStation();
    const agentUrl = station?.agentUrl || "";
    const impressora = selectedPrinter || getLayoutPrinter(layoutType) || "";

    // Tenta enviar todos os itens da requisição
    let sucessos = 0;
    let erros: string[] = [];

    for (const rotulo of rotulos) {
      const result = await imprimirViaRotutxRaw(
        apiConfig.serverUrl,
        searchedRequisition,
        rotulo.nrItem || "0",
        impressora,
        agentUrl,
        apiConfig.codigoFilial
      );
      if (result.success) {
        sucessos++;
      } else {
        erros.push(`Item ${rotulo.nrItem}: ${result.error}`);
      }
    }

    setIsPrinting(false);
    if (sucessos > 0) {
      toast({
        title: "FC RAW enviado!",
        description: `${sucessos}/${rotulos.length} rótulo(s) enviados direto para a impressora.`,
      });
    } else {
      toast({
        title: "Erro FC RAW",
        description: erros[0] || "Falha ao enviar ROTUTX RAW.",
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
              {/* Toggle Modo FC / Agente */}
              {getPrintAgentConfig().enabled && (
                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                  <span className={`text-xs font-medium ${modoImpressao === 'agente' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Agente
                  </span>
                  <Switch
                    checked={modoImpressao === 'rotutx'}
                    onCheckedChange={handleModoChange}
                  />
                  <span className={`text-xs font-medium ${modoImpressao === 'rotutx' ? 'text-primary' : 'text-muted-foreground'}`}>
                    FC Direto
                  </span>
                </div>
              )}
              {/* Botão FC RAW */}
              {getPrintAgentConfig().enabled && rotulos.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePrintFcRaw}
                  disabled={isPrinting}
                  className="gap-1.5"
                  title="Envia os bytes exatos do ROTUTX (Fórmula Certa) direto para a impressora"
                >
                  <Zap className="h-4 w-4" />
                  FC RAW
                </Button>
              )}
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
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <LayoutSelector value={layoutType} onChange={handleLayoutChange} />
              <Button variant="ghost" size="icon" onClick={() => setEditorOpen(true)} title="Editar layout">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const ac = getPrintAgentConfig();
              if (ac.enabled && ac.calibracao) {
                return (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                    <span className={`font-medium ${modoImpressao === 'rotutx' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {modoImpressao === 'rotutx' ? '⚡ FC Direto' : '🔧 Agente'}
                    </span>
                    <span className="text-border">|</span>
                    <span title="Contraste">H{ac.calibracao.contraste}</span>
                    <span title="Fonte (Calibração)">F{ac.calibracao.fonte}</span>
                    <span title="Rotação (Calibração)">R{ac.calibracao.rotacao}</span>
                    <span className="text-border">|</span>
                    <span title="Impressora">{selectedPrinter || ac.impressora}</span>
                  </div>
                );
              }
              return null;
            })()}
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
            onPrintAll={handlePrintAll}
            onPrintFcRaw={getPrintAgentConfig().enabled ? handlePrintFcRaw : undefined}
            isPrinting={isPrinting}
            availablePrinters={availablePrinters}
            selectedPrinter={selectedPrinter}
            onPrinterChange={(printer) => {
              setSelectedPrinter(printer);
              // Salvar associação layout↔impressora
              setLayoutPrinter(layoutType, printer);
            }}
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
          <span className="ml-2 text-xs text-muted-foreground/60">V1</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
