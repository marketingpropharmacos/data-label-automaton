import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, Layout, Edit2, Printer, TestTube, Wifi, WifiOff, FileCode, Copy, ArrowLeftRight, Send, Monitor, Plus, Trash2 } from "lucide-react";
import { type SuggestedFixes, type CalibrationFix } from "@/utils/pplaParser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getApiConfig,
  setApiConfig,
  getPharmacyConfig,
  setPharmacyConfig,
  getPrintAgentConfig,
  setPrintAgentConfig,
  getPrintStations,
  setPrintStations,
  getActiveStationId,
  setActiveStationId,
  type PrintStation,
} from "@/config/api";
import { verificarConexao } from "@/services/requisicaoService";
import { verificarAgente, listarImpressoras, testeImpressaoAgente, diagnosticoPPLA, testePplaDireto } from "@/services/printAgentService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApiConfig, PharmacyConfig, LayoutType, LayoutConfig, PrintAgentConfig, PrinterCalibrationConfig } from "@/types/requisicao";
import { getLayouts, fieldLabels } from "@/config/layouts";
import LayoutEditor from "@/components/LayoutEditor";
import PPLAComparer from "@/components/PPLAComparer";
import PrinterDefinitions from "@/components/PrinterDefinitions";

const LabelSettings = () => {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutType | null>(null);
  const [layouts, setLayouts] = useState<Record<LayoutType, LayoutConfig>>(getLayouts());
  
  // Estados do agente HTTP
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState<boolean | null>(null);
  const [isPrintingAgentTest, setIsPrintingAgentTest] = useState(false);
  const [agentPrinters, setAgentPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);


  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isDiagnosticLoading, setIsDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isPplaDiretoOpen, setIsPplaDiretoOpen] = useState(false);
  const [isPplaDiretoSending, setIsPplaDiretoSending] = useState(false);
  const [pplaDiretoTexto, setPplaDiretoTexto] = useState("");
  
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(getApiConfig());
  const [pharmacyConfig, setPharmacyConfigState] = useState<PharmacyConfig>(getPharmacyConfig());
  const [agentConfig, setAgentConfigState] = useState<PrintAgentConfig>(getPrintAgentConfig());
  
  // Multi-estação
  const [stations, setStationsState] = useState<PrintStation[]>(getPrintStations());
  const [activeStationId, setActiveStationIdState] = useState<string>(getActiveStationId());

  // Auto-salvar agentConfig sempre que mudar
  useEffect(() => {
    setPrintAgentConfig(agentConfig);
  }, [agentConfig]);

  // Verificar status do agente ao carregar
  useEffect(() => {
    if (agentConfig.agentUrl) {
      checkAgentStatus();
    }
  }, []);

  const checkAgentStatus = async () => {
    const result = await verificarAgente(agentConfig.agentUrl);
    setIsAgentOnline(result.success);
    if (result.success) {
      loadAgentPrinters();
    }
  };

  const loadAgentPrinters = async () => {
    setIsLoadingPrinters(true);
    const result = await listarImpressoras(agentConfig.agentUrl);
    if (result.success && result.data) {
      setAgentPrinters(result.data.impressoras);
    }
    setIsLoadingPrinters(false);
  };

  const handleLayoutSave = (layout: LayoutConfig) => {
    console.log('[LabelSettings] Salvando layout:', layout.tipo);
    const updatedLayouts = getLayouts();
    setLayouts(updatedLayouts);
    setEditingLayout(null);
    toast({
      title: "Layout salvo!",
      description: `O layout ${layout.nome} foi salvo com sucesso.`,
    });
  };

  const handleSaveApi = () => {
    setApiConfig(apiConfig);
    toast({
      title: "Configurações salvas",
      description: "URL do servidor atualizada com sucesso.",
    });
  };

  const handleSavePharmacy = () => {
    setPharmacyConfig(pharmacyConfig);
    toast({
      title: "Configurações salvas",
      description: "Dados da farmácia atualizados com sucesso.",
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    const isConnected = await verificarConexao();
    setIsTestingConnection(false);
    
    if (isConnected) {
      toast({
        title: "Conexão bem-sucedida!",
        description: "O servidor Python está respondendo corretamente.",
      });
    } else {
      toast({
        title: "Falha na conexão",
        description: "Não foi possível conectar ao servidor. Verifique se o servidor Python está em execução.",
        variant: "destructive",
      });
    }
  };

  // handleSaveLabel, handleSavePrinter, handleTestPrinter, handlePrintTest removidos - abas legadas

  // Handlers do Agente HTTP
  const handleSaveAgent = () => {
    setPrintAgentConfig(agentConfig);
    toast({
      title: "Configurações salvas",
      description: "Configurações do agente HTTP atualizadas.",
    });
  };

  const handleTestAgent = async () => {
    setIsTestingAgent(true);
    const result = await verificarAgente(agentConfig.agentUrl);
    setIsTestingAgent(false);
    setIsAgentOnline(result.success);
    
    if (result.success) {
      toast({
        title: "Agente online!",
        description: `Conectado: ${result.data?.impressora_padrao || 'OK'}`,
      });
      loadAgentPrinters();
    } else {
      toast({
        title: "Agente offline",
        description: result.error || "Não foi possível conectar ao agente.",
        variant: "destructive",
      });
    }
  };

  const handlePrintAgentTest = async () => {
    setIsPrintingAgentTest(true);
    const result = await testeImpressaoAgente(agentConfig.agentUrl);
    setIsPrintingAgentTest(false);
    
    if (result.success) {
      toast({
        title: "Teste enviado!",
        description: "Etiqueta de teste enviada via agente HTTP.",
      });
    } else {
      toast({
        title: "Falha na impressão",
        description: result.error || "Não foi possível imprimir via agente.",
        variant: "destructive",
      });
    }
  };

  const handleDiagnosticPPLA = async () => {
    setIsDiagnosticLoading(true);
    setDiagnosticResult(null);
    const cal = agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 };
    const result = await diagnosticoPPLA(agentConfig.agentUrl, agentConfig.impressora, 'AMP_CX', cal);
    setIsDiagnosticLoading(false);
    if (result.success) {
      setDiagnosticResult(result.data);
      setIsDiagnosticOpen(true);
    } else {
      toast({
        title: "Erro no diagnóstico",
        description: result.error || "Não foi possível gerar diagnóstico.",
        variant: "destructive",
      });
    }
  };

  const handlePplaDireto = async () => {
    if (!pplaDiretoTexto.trim()) {
      toast({ title: "Cole os comandos PPLA capturados", variant: "destructive" });
      return;
    }
    setIsPplaDiretoSending(true);
    const result = await testePplaDireto(agentConfig.agentUrl, agentConfig.impressora, pplaDiretoTexto);
    setIsPplaDiretoSending(false);
    if (result.success) {
      toast({
        title: "PPLA direto enviado! ✓",
        description: `${result.data?.blocos || 0} etiqueta(s), ${result.data?.bytes_enviados || 0} bytes`,
      });
    } else {
      toast({
        title: "Falha no envio PPLA direto",
        description: result.error || "Erro desconhecido",
        variant: "destructive",
      });
    }
  };





  return (
    <div className="space-y-6">
      <Tabs defaultValue="definicoes" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="definicoes">Definições</TabsTrigger>
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
          <TabsTrigger value="agente">Agente HTTP</TabsTrigger>
          <TabsTrigger value="farmacia">Farmácia</TabsTrigger>
          <TabsTrigger value="layouts">Layouts</TabsTrigger>
        </TabsList>

        <TabsContent value="definicoes">
          <PrinterDefinitions />
        </TabsContent>

        <TabsContent value="servidor">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Servidor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverUrl">URL do Servidor Python</Label>
                <Input
                  id="serverUrl"
                  placeholder="http://192.168.6.46:5000"
                  value={apiConfig.serverUrl}
                  onChange={(e) => setApiConfigState({ ...apiConfig, serverUrl: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Endereço do servidor Python que conecta ao Firebird
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="codigoFilial">Código da Filial</Label>
                <Input
                  id="codigoFilial"
                  placeholder="279"
                  value={apiConfig.codigoFilial}
                  onChange={(e) => setApiConfigState({ ...apiConfig, codigoFilial: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Código da filial no sistema (ex: 279 para PROPHARMACOS)
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSaveApi}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agente">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Agente HTTP de Impressão
                {isAgentOnline !== null && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isAgentOnline 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {isAgentOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ─── Seletor de Estação ─── */}
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Estação Ativa</Label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {stations.map((station) => (
                    <Button
                      key={station.id}
                      variant={activeStationId === station.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setActiveStationIdState(station.id);
                        setActiveStationId(station.id);
                        // Carregar config da estação selecionada
                        setAgentConfigState({
                          ...agentConfig,
                          agentUrl: station.agentUrl,
                          calibracao: station.calibracao || agentConfig.calibracao,
                        });
                        setIsAgentOnline(null);
                        setAgentPrinters([]);
                        toast({
                          title: `Estação: ${station.nome}`,
                          description: station.agentUrl || '(URL não configurada)',
                        });
                      }}
                    >
                      <Monitor className="h-3 w-3 mr-1" />
                      {station.nome}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada estação (PC) tem sua própria URL ngrok e impressora. Selecione a estação ativa para configurar.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="agentEnabled" className="text-base font-medium">Usar Agente HTTP</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, a impressão é enviada diretamente para o PC local
                  </p>
                </div>
                <Switch
                  id="agentEnabled"
                  checked={agentConfig.enabled}
                  onCheckedChange={(checked) => setAgentConfigState({ ...agentConfig, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentUrl">URL do Agente ({stations.find(s => s.id === activeStationId)?.nome || 'Estação'})</Label>
                <Input
                  id="agentUrl"
                  placeholder="https://xxx.ngrok-free.dev"
                  value={agentConfig.agentUrl}
                  onChange={(e) => {
                    setAgentConfigState({ ...agentConfig, agentUrl: e.target.value });
                    // Também salvar na estação
                    const updated = stations.map(s => s.id === activeStationId ? { ...s, agentUrl: e.target.value } : s);
                    setStationsState(updated);
                    setPrintStations(updated);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  URL HTTPS do ngrok da estação selecionada
                </p>
              </div>


              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => {
                  setPrintAgentConfig(agentConfig);
                  // Salvar estação também
                  const updated = stations.map(s => s.id === activeStationId ? { ...s, agentUrl: agentConfig.agentUrl, calibracao: agentConfig.calibracao } : s);
                  setStationsState(updated);
                  setPrintStations(updated);
                  toast({ title: "Configurações salvas", description: `Estação ${stations.find(s => s.id === activeStationId)?.nome} atualizada.` });
                }}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestAgent}
                  disabled={isTestingAgent}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isTestingAgent ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handlePrintAgentTest}
                  disabled={isPrintingAgentTest || !isAgentOnline}
                >
                  <TestTube className={`h-4 w-4 mr-2 ${isPrintingAgentTest ? 'animate-pulse' : ''}`} />
                  Imprimir Teste
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDiagnosticPPLA}
                  disabled={isDiagnosticLoading || !isAgentOnline}
                >
                  <FileCode className={`h-4 w-4 mr-2 ${isDiagnosticLoading ? 'animate-pulse' : ''}`} />
                  Diagnóstico PPLA
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => setIsPplaDiretoOpen(true)}
                  disabled={!isAgentOnline}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  📋 PPLA Direto
                </Button>
              {diagnosticResult && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCompareOpen(true)}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Comparar com FC
                  </Button>
                )}
              </div>

              {/* Dialog PPLA Direto */}
              <Dialog open={isPplaDiretoOpen} onOpenChange={setIsPplaDiretoOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-amber-600" />
                      Teste PPLA Direto
                    </DialogTitle>
                    <DialogDescription>
                      Cole os comandos PPLA capturados do Fórmula Certa (ex: f289, L, e, PA, D11, H14...) e envie direto para a impressora.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Gerador de bloco PPLA */}
                    <div className="p-3 rounded border border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                      <Label className="text-sm font-semibold">⚡ Gerador Rápido de Bloco PPLA</Label>
                      <p className="text-xs text-muted-foreground">Digite até 8 linhas de texto. O bloco PPLA será gerado com coordenadas espaçadas para etiqueta 45x25mm (fonte 2 padrão, rotação 0).</p>
                      <textarea
                        className="w-full h-24 p-2 font-mono text-xs border rounded-md bg-background resize-y"
                        placeholder={"Linha 1: Nome paciente\nLinha 2: REQ:006809\nLinha 3: Dr(a) Fulano\nLinha 4: CRM-SP-12345\nLinha 5: Composição...\n(máx 8 linhas)"}
                        id="ppla-gen-input"
                      />
                      <div className="flex gap-2 items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500 text-amber-700 hover:bg-amber-100"
                          onClick={() => {
                            const input = (document.getElementById('ppla-gen-input') as HTMLTextAreaElement)?.value || '';
                            const lines = input.split('\n').filter(l => l.trim());
                            if (lines.length === 0) return;
                            // Y coords em dots (origin bottom-left), espaçamento de 22 dots (~2.7mm) entre linhas
                            // Para 8 linhas em 200 dots: 185, 163, 141, 119, 97, 75, 53, 31
                            const yCoords = [185, 163, 141, 119, 97, 75, 53, 31];
                            const xStart = 10;
                            const pplaLines: string[] = [];
                            pplaLines.push('f289');
                            pplaLines.push('L');
                            pplaLines.push('e');
                            pplaLines.push('PA');
                            pplaLines.push('D11');
                            pplaLines.push('H14');
                            for (let i = 0; i < Math.min(lines.length, 8); i++) {
                              const y = String(yCoords[i]).padStart(4, '0');
                              const x = String(xStart).padStart(4, '0');
                              pplaLines.push(`10211${y}${x}${lines[i].trim()}`);
                            }
                            pplaLines.push('Q0001E');
                            setPplaDiretoTexto(pplaLines.join('\n'));
                          }}
                        >
                          Gerar Bloco PPLA ↓
                        </Button>
                        <span className="text-xs text-muted-foreground">Preenche o campo abaixo com comandos prontos</span>
                      </div>
                    </div>

                    <div>
                      <Label>Comandos PPLA (cole aqui a captura ou use o gerador acima)</Label>
                      <textarea
                        className="w-full h-64 mt-2 p-3 font-mono text-xs border rounded-md bg-muted/50 resize-y"
                        placeholder={`f289\nL\ne\nPA\nD11\nH14\n1021101850010TEXTO PACIENTE\n...\nQ0001E`}
                        value={pplaDiretoTexto}
                        onChange={(e) => setPplaDiretoTexto(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handlePplaDireto}
                        disabled={isPplaDiretoSending || !pplaDiretoTexto.trim()}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Send className={`h-4 w-4 mr-2 ${isPplaDiretoSending ? 'animate-pulse' : ''}`} />
                        {isPplaDiretoSending ? 'Enviando...' : 'Enviar para impressora'}
                      </Button>
                      <Button variant="outline" onClick={() => setPplaDiretoTexto("")}>
                        Limpar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O agente converte (f289, L, e...) para bytes PPLA com STX e envia direto para "{agentConfig.impressora}".
                    </p>
                  </div>
                </DialogContent>
              </Dialog>


              {/* Dialog de Diagnóstico PPLA */}
              <Dialog open={isDiagnosticOpen} onOpenChange={setIsDiagnosticOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      Diagnóstico PPLA - Comandos Gerados
                    </DialogTitle>
                    <DialogDescription>
                      Estes são os comandos exatos enviados para a impressora. Compare com o que o Fórmula Certa gera.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {diagnosticResult && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Impressora:</span> {diagnosticResult.impressora_resolvida}
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Layout:</span> {diagnosticResult.layout}
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Dimensões:</span> {diagnosticResult.dims?.largura_mm}x{diagnosticResult.dims?.altura_mm}mm
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Bytes:</span> {diagnosticResult.total_bytes}
                        </div>
                      </div>

                      <div className="p-2 bg-muted rounded text-xs">
                        <span className="font-medium">Calibração:</span>{' '}
                        Fonte={diagnosticResult.calibracao_usada?.fonte}{' '}
                        Rot={diagnosticResult.calibracao_usada?.rotacao}{' '}
                        C={diagnosticResult.calibracao_usada?.margem_c}{' '}
                        R={diagnosticResult.calibracao_usada?.offset_r}{' '}
                        H={diagnosticResult.calibracao_usada?.contraste}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">Comandos PPLA:</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(diagnosticResult.comandos_raw || diagnosticResult.comandos_ppla?.join('\n') || '');
                              toast({ title: "Copiado!", description: "Comandos copiados para a área de transferência." });
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                        <ScrollArea className="h-[300px] rounded border border-border">
                          <pre className="p-3 text-xs font-mono bg-muted/50 whitespace-pre-wrap break-all">
                            {diagnosticResult.comandos_ppla?.map((line: string, i: number) => (
                              <div key={i} className="hover:bg-accent/30 px-1">
                                <span className="text-muted-foreground mr-2">[{String(i).padStart(2, '0')}]</span>
                                {line}
                              </div>
                            ))}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>


              {/* Comparador PPLA com textarea para colar comandos FC */}
              <PPLAComparer
                open={isCompareOpen}
                onOpenChange={setIsCompareOpen}
                systemCommands={diagnosticResult?.comandos_ppla || []}
                systemRaw={diagnosticResult?.comandos_raw}
                capturedCommands={undefined}
                capturedRaw={undefined}
                currentCalibration={agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 }}
                onApplyFixes={(fixes: SuggestedFixes, selected: Record<string, boolean>) => {
                  const cal = agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 };
                  const updated = { ...cal };
                  if (selected.contraste) updated.contraste = fixes.contraste.sugerido;
                  if (selected.fonte) updated.fonte = fixes.fonte.sugerido;
                  if (selected.rotacao) updated.rotacao = fixes.rotacao.sugerido;
                  if (selected.margem_c) updated.margem_c = fixes.margem_c.sugerido;
                  if (selected.offset_r) updated.offset_r = fixes.offset_r.sugerido;
                  setAgentConfigState({ ...agentConfig, calibracao: updated });
                  toast({
                    title: "Calibração atualizada!",
                    description: "Valores ajustados com base no Fórmula Certa. Rode o diagnóstico novamente para confirmar.",
                  });
                }}
              />

              {agentConfig.enabled && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                  <p className="text-sm font-medium text-primary">
                    ✓ Modo Agente HTTP ativado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A impressão será enviada para {agentConfig.agentUrl} → {agentConfig.impressora}
                  </p>
                </div>
              )}

              {/* Calibração PPLA: Margem C, Offset R, Contraste H */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Calibração PPLA (Ajuste Fino)
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Ajuste margem e offset para evitar cortes na impressão. Valores em 0.1mm (ex: 10 = 1mm).
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="margemC">Margem Esquerda (Cxxxx)</Label>
                    <Input
                      id="margemC"
                      type="number"
                      min={0}
                      max={200}
                      placeholder="0"
                      value={agentConfig.calibracao?.margem_c ?? 0}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 },
                          margem_c: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Desloca texto para a direita. 0 = sem margem.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offsetR">Offset Vertical (Rxxxx)</Label>
                    <Input
                      id="offsetR"
                      type="number"
                      min={-500}
                      max={500}
                      placeholder="0"
                      value={agentConfig.calibracao?.offset_r ?? 0}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 },
                          offset_r: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ajusta posição vertical. Texto muito abaixo? Use valor negativo para subir.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contrasteH">Contraste (Hxx)</Label>
                    <Input
                      id="contrasteH"
                      type="number"
                      min={5}
                      max={20}
                      placeholder="12"
                      value={agentConfig.calibracao?.contraste ?? 12}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 },
                          contraste: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      10=padrão, 16=máx recomendado, 20=máximo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fontePPLA">Fonte PPLA (0-9)</Label>
                    <Input
                      id="fontePPLA"
                      type="number"
                      min={0}
                      max={9}
                      placeholder="2"
                      value={agentConfig.calibracao?.fonte ?? 2}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 },
                          fonte: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      0=menor (6x10), 2=padrão (10x16), 4=grande (18x28).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rotacaoPPLA">Rotação (0-3)</Label>
                    <Input
                      id="rotacaoPPLA"
                      type="number"
                      min={0}
                      max={3}
                      placeholder="0"
                      value={agentConfig.calibracao?.rotacao ?? 0}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 0 },
                          rotacao: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      0=horizontal, 1=90°, 2=180°, 3=270°. Etiqueta em branco? Tente 0.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Impressora removida - sistema usa apenas Agente HTTP */}

        <TabsContent value="farmacia">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Farmácia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Farmácia</Label>
                  <Input
                    id="nome"
                    value={pharmacyConfig.nome}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={pharmacyConfig.telefone}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={pharmacyConfig.endereco}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, endereco: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={pharmacyConfig.cnpj}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, cnpj: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="farmaceutico">Farmacêutico Responsável</Label>
                  <Input
                    id="farmaceutico"
                    value={pharmacyConfig.farmaceutico}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, farmaceutico: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crf">CRF</Label>
                  <Input
                    id="crf"
                    value={pharmacyConfig.crf}
                    onChange={(e) => setPharmacyConfigState({ ...pharmacyConfig, crf: e.target.value })}
                  />
                </div>
              </div>
              
              <Button onClick={handleSavePharmacy}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Rótulo removida - dimensões vêm dos layouts/definições */}

        <TabsContent value="layouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Layouts de Rótulos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Personalize a posição dos campos em cada tipo de layout. Arraste os campos para reposicioná-los.
              </p>
              
              <div className="grid gap-4 md:grid-cols-1">
                {(Object.keys(layouts) as LayoutType[]).map((tipo) => {
                  const layout = layouts[tipo];
                  const visibleFields = Object.entries(layout.campoConfig).filter(([_, c]) => c.visible).length;
                  const totalFields = Object.keys(layout.campoConfig).length;
                  
                  return (
                    <Card key={tipo} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{layout.nome}</CardTitle>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{tipo}</span>
                              {layout.dimensoes && (
                                <span>{layout.dimensoes.larguraMM}×{layout.dimensoes.alturaMM}mm</span>
                              )}
                              <span>{layout.linhas.length} linhas</span>
                              <span>{visibleFields}/{totalFields} campos</span>
                            </div>
                          </div>
                          <Dialog open={editingLayout === tipo} onOpenChange={(open) => setEditingLayout(open ? tipo : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit2 className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Editar Layout: {layout.nome}</DialogTitle>
                                <DialogDescription>
                                  Organize os campos em linhas e configure tamanho, negrito e visibilidade de cada campo.
                                </DialogDescription>
                              </DialogHeader>
                              <LayoutEditor 
                                layout={layouts[tipo]} 
                                onSave={handleLayoutSave}
                                onClose={() => setEditingLayout(null)}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-1">
                          {layout.linhas.map((linha, idx) => {
                            const campos = linha.campos.filter(f => layout.campoConfig[f]?.visible);
                            if (campos.length === 0) return null;
                            return (
                              <div key={linha.id} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground w-14 flex-shrink-0 font-mono">
                                  L{idx + 1} ({linha.spacing?.[0] || 'n'})
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {campos.map(f => {
                                    const cfg = layout.campoConfig[f];
                                    return (
                                      <span 
                                        key={f} 
                                        className={`px-1.5 py-0.5 rounded bg-muted ${cfg.bold ? 'font-bold' : ''} ${cfg.uppercase ? 'uppercase' : ''}`}
                                        title={`${cfg.fontSize}px${cfg.bold ? ', bold' : ''}${cfg.uppercase ? ', UPPER' : ''}`}
                                      >
                                        {fieldLabels[f]} <span className="text-muted-foreground">({cfg.fontSize})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabelSettings;
