import { useState } from "react";
import { Settings, Save, RefreshCw, Layout, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getApiConfig,
  setApiConfig,
  getPharmacyConfig,
  setPharmacyConfig,
  getLabelConfig,
  setLabelConfig,
} from "@/config/api";
import { verificarConexao } from "@/services/requisicaoService";
import { ApiConfig, PharmacyConfig, LabelConfig, LayoutType, LayoutConfig } from "@/types/requisicao";
import { getLayouts, defaultLayouts } from "@/config/layouts";
import LayoutEditor from "@/components/LayoutEditor";

const LabelSettings = () => {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [editingLayout, setEditingLayout] = useState<LayoutType | null>(null);
  const [layouts, setLayouts] = useState<Record<LayoutType, LayoutConfig>>(getLayouts());
  
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(getApiConfig());
  const [pharmacyConfig, setPharmacyConfigState] = useState<PharmacyConfig>(getPharmacyConfig());
  const [labelConfig, setLabelConfigState] = useState<LabelConfig>(getLabelConfig());

  const handleLayoutSave = (layout: LayoutConfig) => {
    setLayouts(prev => ({ ...prev, [layout.tipo]: layout }));
    setEditingLayout(null);
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="servidor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="servidor">Servidor</TabsTrigger>
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
              
              <div className="grid gap-4 md:grid-cols-2">
                {(Object.keys(layouts) as LayoutType[]).map((tipo) => {
                  const layout = layouts[tipo];
                  return (
                    <Card key={tipo} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{layout.nome}</CardTitle>
                          <Dialog open={editingLayout === tipo} onOpenChange={(open) => setEditingLayout(open ? tipo : null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Edit2 className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Editar Layout: {layout.nome}</DialogTitle>
                              </DialogHeader>
                              <LayoutEditor 
                                layout={layout} 
                                onSave={handleLayoutSave}
                                onClose={() => setEditingLayout(null)}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {tipo}
                        </p>
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
