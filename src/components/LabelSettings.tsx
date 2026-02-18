import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, Layout, Edit2, Printer, TestTube, Wifi, WifiOff, FileCode, Copy, Radio, ArrowLeftRight } from "lucide-react";
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
  getLabelConfig,
  setLabelConfig,
  getPrinterConfig,
  setPrinterConfig,
  getPrintAgentConfig,
  setPrintAgentConfig,
} from "@/config/api";
import { verificarConexao, verificarImpressora, imprimirTeste } from "@/services/requisicaoService";
import { verificarAgente, listarImpressoras, testeImpressaoAgente, diagnosticoPPLA, capturarPorta9100 } from "@/services/printAgentService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApiConfig, PharmacyConfig, LabelConfig, LayoutType, LayoutConfig, PrinterConfig, PrintAgentConfig, PrinterCalibrationConfig } from "@/types/requisicao";
import { getLayouts, fieldLabels } from "@/config/layouts";
import LayoutEditor from "@/components/LayoutEditor";
import PPLAComparer from "@/components/PPLAComparer";

const LabelSettings = () => {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
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
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<any>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(getApiConfig());
  const [pharmacyConfig, setPharmacyConfigState] = useState<PharmacyConfig>(getPharmacyConfig());
  const [labelConfig, setLabelConfigState] = useState<LabelConfig>(getLabelConfig());
  const [printerConfig, setPrinterConfigState] = useState<PrinterConfig>(getPrinterConfig());
  const [agentConfig, setAgentConfigState] = useState<PrintAgentConfig>(getPrintAgentConfig());

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

  const handleSaveLabel = () => {
    setLabelConfig(labelConfig);
    toast({
      title: "Configurações salvas",
      description: "Dimensões do rótulo atualizadas com sucesso.",
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

  const handleSavePrinter = () => {
    setPrinterConfig(printerConfig);
    toast({
      title: "Configurações salvas",
      description: "Configurações da impressora atualizadas com sucesso.",
    });
  };

  const handleTestPrinter = async () => {
    setIsTestingPrinter(true);
    const caminho = `\\\\${printerConfig.nomePC}\\${printerConfig.nomeCompartilhamento}`;
    const result = await verificarImpressora(caminho);
    setIsTestingPrinter(false);
    
    if (result.success) {
      toast({
        title: "Impressora acessível!",
        description: `Conexão com ${caminho} estabelecida.`,
      });
    } else {
      toast({
        title: "Falha na conexão",
        description: result.error || "Não foi possível acessar a impressora.",
        variant: "destructive",
      });
    }
  };

  const handlePrintTest = async () => {
    setIsPrintingTest(true);
    const caminho = `\\\\${printerConfig.nomePC}\\${printerConfig.nomeCompartilhamento}`;
    const result = await imprimirTeste(caminho);
    setIsPrintingTest(false);
    
    if (result.success) {
      toast({
        title: "Etiqueta enviada!",
        description: "Etiqueta de teste enviada para a impressora.",
      });
    } else {
      toast({
        title: "Falha na impressão",
        description: result.error || "Não foi possível imprimir a etiqueta de teste.",
        variant: "destructive",
      });
    }
  };

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
    const cal = agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 };
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

  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureResult(null);
    setIsCaptureOpen(true);
    const result = await capturarPorta9100(agentConfig.agentUrl, 30, 9100);
    setIsCapturing(false);
    if (result.success) {
      setCaptureResult(result.data);
      toast({
        title: "Captura concluída!",
        description: `${result.data?.bytes_recebidos} bytes capturados (${result.data?.formato_detectado})`,
      });
    } else {
      setIsCaptureOpen(false);
      toast({
        title: "Falha na captura",
        description: result.error || "Timeout ou erro na captura.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="servidor" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
          <TabsTrigger value="agente">Agente HTTP</TabsTrigger>
          <TabsTrigger value="impressora">Impressora</TabsTrigger>
          <TabsTrigger value="farmacia">Farmácia</TabsTrigger>
          <TabsTrigger value="rotulo">Rótulo</TabsTrigger>
          <TabsTrigger value="layouts">Layouts</TabsTrigger>
        </TabsList>

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
                <Label htmlFor="agentUrl">URL do Agente</Label>
                <Input
                  id="agentUrl"
                  placeholder="http://192.168.10.105:5001"
                  value={agentConfig.agentUrl}
                  onChange={(e) => setAgentConfigState({ ...agentConfig, agentUrl: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Endereço do agente Flask rodando no PC da impressora (porta 5001)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentPrinter">Impressora</Label>
                <Select
                  value={agentConfig.impressora}
                  onValueChange={(value) => setAgentConfigState({ ...agentConfig, impressora: value })}
                >
                  <SelectTrigger id="agentPrinter">
                    <SelectValue placeholder="Selecione a impressora" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {agentPrinters.length > 0 ? (
                      agentPrinters.map((printer) => (
                        <SelectItem key={printer} value={printer}>
                          {printer}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={agentConfig.impressora}>
                        {agentConfig.impressora}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Nome da impressora instalada no PC do agente
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSaveAgent}>
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
                  variant="outline" 
                  onClick={handleCapture}
                  disabled={isCapturing || !isAgentOnline}
                >
                  <Radio className={`h-4 w-4 mr-2 ${isCapturing ? 'animate-pulse' : ''}`} />
                  Capturar FC (9100)
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

              {/* Dialog de Captura porta 9100 */}
              <Dialog open={isCaptureOpen} onOpenChange={(open) => { if (!isCapturing) setIsCaptureOpen(open); }}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Radio className="h-5 w-5" />
                      Captura Porta 9100 - Fórmula Certa
                    </DialogTitle>
                    <DialogDescription>
                      {isCapturing 
                        ? "Aguardando conexão... Imprima pelo Fórmula Certa apontando para o IP deste PC."
                        : "Comandos capturados do Fórmula Certa."
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  {isCapturing && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-muted-foreground">Escutando na porta 9100... (30s timeout)</p>
                      <p className="text-xs text-muted-foreground">No Fórmula Certa, configure a impressora para o IP deste PC, porta 9100</p>
                    </div>
                  )}

                  {captureResult && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Origem:</span> {captureResult.origem}
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Formato:</span> {captureResult.formato_detectado}
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">Bytes:</span> {captureResult.bytes_recebidos}
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <span className="font-medium">STX:</span> {captureResult.analise?.count_STX} | <span className="font-medium">CR:</span> {captureResult.analise?.count_CR}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">Comandos Capturados:</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(captureResult.comandos_raw || captureResult.comandos?.join('\n') || '');
                              toast({ title: "Copiado!", description: "Comandos capturados copiados." });
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                        <ScrollArea className="h-[300px] rounded border border-border">
                          <pre className="p-3 text-xs font-mono bg-muted/50 whitespace-pre-wrap break-all">
                            {captureResult.comandos?.map((line: string, i: number) => (
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
                capturedCommands={captureResult?.comandos}
                capturedRaw={captureResult?.comandos_raw}
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
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 },
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
                      min={0}
                      max={200}
                      placeholder="0"
                      value={agentConfig.calibracao?.offset_r ?? 0}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 },
                          offset_r: Number(e.target.value),
                        },
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ajusta posição vertical. Corta em cima? Reduza. Corta embaixo? Aumente.
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
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 },
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
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 },
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
                      placeholder="1"
                      value={agentConfig.calibracao?.rotacao ?? 1}
                      onChange={(e) => setAgentConfigState({
                        ...agentConfig,
                        calibracao: {
                          ...agentConfig.calibracao || { margem_c: 0, offset_r: 0, contraste: 12, fonte: 2, rotacao: 1 },
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

        <TabsContent value="impressora">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Configurações da Impressora (via Servidor)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentConfig.enabled && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ O Agente HTTP está ativado. Esta configuração só será usada se o agente for desativado.
                  </p>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nomePC">Nome do PC</Label>
                  <Input
                    id="nomePC"
                    placeholder="Campos2"
                    value={printerConfig.nomePC}
                    onChange={(e) => setPrinterConfigState({ ...printerConfig, nomePC: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nome do computador onde a impressora está conectada
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeCompartilhamento">Nome do Compartilhamento</Label>
                  <Input
                    id="nomeCompartilhamento"
                    placeholder="Campos2"
                    value={printerConfig.nomeCompartilhamento}
                    onChange={(e) => setPrinterConfigState({ ...printerConfig, nomeCompartilhamento: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Nome do compartilhamento Windows da impressora
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Caminho completo:</p>
                <code className="text-sm text-primary">
                  \\{printerConfig.nomePC}\{printerConfig.nomeCompartilhamento}
                </code>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSavePrinter}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestPrinter}
                  disabled={isTestingPrinter}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isTestingPrinter ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handlePrintTest}
                  disabled={isPrintingTest}
                >
                  <TestTube className={`h-4 w-4 mr-2 ${isPrintingTest ? 'animate-pulse' : ''}`} />
                  Imprimir Teste
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="rotulo">
          <Card>
            <CardHeader>
              <CardTitle>Dimensões do Rótulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="largura">Largura (mm)</Label>
                  <Input
                    id="largura"
                    type="number"
                    value={labelConfig.larguraMM}
                    onChange={(e) => setLabelConfigState({ ...labelConfig, larguraMM: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altura">Altura (mm)</Label>
                  <Input
                    id="altura"
                    type="number"
                    value={labelConfig.alturaMM}
                    onChange={(e) => setLabelConfigState({ ...labelConfig, alturaMM: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Defina as dimensões em milímetros para a impressora Argox
              </p>
              
              <Button onClick={handleSaveLabel}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
