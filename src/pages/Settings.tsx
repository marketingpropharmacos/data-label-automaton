import { useState } from "react";
import { ArrowLeft, Upload, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import LabelSettings from "@/components/LabelSettings";
import AgentesControl from "@/components/AgentesControl";
import { useToast } from "@/hooks/use-toast";
import { SystemConfigService } from "@/services/systemConfigService";
import logoProPharmacos from "@/assets/logo-propharmacos.png";

const Settings = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handlePublishConfigs = async () => {
    setIsSyncing(true);
    try {
      const ok = await SystemConfigService.pushLocalStorageToSupabase();
      toast({
        title: ok ? "Configs publicadas!" : "Erro ao publicar",
        description: ok
          ? "Todas as configurações foram salvas no Supabase. Operadores receberão ao fazer login."
          : "Não foi possível salvar. Verifique permissões.",
        variant: ok ? "default" : "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-card via-card to-accent/30 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="border-primary/20 hover:bg-accent" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Link>
            </Button>
            <img 
              src={logoProPharmacos} 
              alt="ProPharmacos" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-primary">Configurações</h1>
              <p className="text-sm text-muted-foreground">Sistema de Rótulos</p>
            </div>
            <div className="ml-auto">
              <Button
                onClick={handlePublishConfigs}
                disabled={isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <Upload className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Publicar Configs para Operadores
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <AgentesControl />
        <Separator />
        <LabelSettings />
      </main>
    </div>
  );
};

export default Settings;
