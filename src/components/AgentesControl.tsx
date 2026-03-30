import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi, WifiOff, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgenteStatus {
  id: string;
  nome: string;
  url: string;
  hostname: string;
  versao: string;
  status: string;
  ultimo_ping: string | null;
  atualizado_em: string | null;
}

function formatUltimoPing(ts: string | null): string {
  if (!ts) return "nunca";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

export default function AgentesControl() {
  const [agentes, setAgentes] = useState<AgenteStatus[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchAgentes = async () => {
    const { data, error } = await supabase
      .from("agentes_status")
      .select("*")
      .order("id");
    if (!error && data) {
      // Marcar como offline se último ping > 3min
      const now = Date.now();
      const updated = data.map((a: AgenteStatus) => {
        if (a.ultimo_ping) {
          const diff = (now - new Date(a.ultimo_ping).getTime()) / 1000;
          if (diff > 180 && a.status === "online") {
            return { ...a, status: "offline" };
          }
        }
        return a;
      });
      setAgentes(updated);
    }
  };

  useEffect(() => {
    fetchAgentes();

    // Realtime subscription
    const channel = supabase
      .channel("agentes_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agentes_status" },
        () => fetchAgentes()
      )
      .subscribe();

    // Atualiza a cada 30s para recalcular "x min atrás"
    const interval = setInterval(fetchAgentes, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const handleReiniciar = async (agente: AgenteStatus) => {
    if (!agente.url) {
      toast({
        title: "Agente offline",
        description: `${agente.nome} não tem URL registrada. Verifique se o ngrok está rodando.`,
        variant: "destructive",
      });
      return;
    }

    setLoading((l) => ({ ...l, [agente.id]: true }));
    try {
      const resp = await fetch(`${agente.url}/update`, { method: "POST" });
      const data = await resp.json();
      toast({
        title: data.updated ? "Atualizado!" : "Já atualizado",
        description: data.message || `${agente.nome} respondeu OK`,
      });
    } catch (e) {
      toast({
        title: "Erro ao contatar agente",
        description: `Não foi possível alcançar ${agente.nome} em ${agente.url}`,
        variant: "destructive",
      });
    } finally {
      setLoading((l) => ({ ...l, [agente.id]: false }));
    }
  };

  const handleVerificarHealth = async (agente: AgenteStatus) => {
    if (!agente.url) {
      toast({
        title: "Sem URL",
        description: `${agente.nome} não tem URL ngrok registrada.`,
        variant: "destructive",
      });
      return;
    }

    setLoading((l) => ({ ...l, [`health_${agente.id}`]: true }));
    try {
      const resp = await fetch(`${agente.url}/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await resp.json();
      toast({
        title: `${agente.nome} — ONLINE`,
        description: `Impressoras: ${(data.impressoras || []).join(", ") || "nenhuma detectada"}`,
      });
    } catch (e) {
      toast({
        title: `${agente.nome} — sem resposta`,
        description: "Agente não respondeu ao /health",
        variant: "destructive",
      });
    } finally {
      setLoading((l) => ({ ...l, [`health_${agente.id}`]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">Agentes de Impressão</h2>
        <Button variant="outline" size="sm" onClick={fetchAgentes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {agentes.map((agente) => {
          const online = agente.status === "online";
          return (
            <Card key={agente.id} className={`border ${online ? "border-green-500/40" : "border-border"}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    {agente.nome}
                  </span>
                  <Badge
                    variant={online ? "default" : "secondary"}
                    className={online ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {online ? (
                      <><Wifi className="h-3 w-3 mr-1" />Online</>
                    ) : (
                      <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                    )}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Hostname:</span>{" "}
                    {agente.hostname || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Versão:</span>{" "}
                    {agente.versao || "—"}
                  </div>
                  <div>
                    <span className="font-medium">URL ngrok:</span>{" "}
                    {agente.url ? (
                      <a
                        href={agente.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline break-all"
                      >
                        {agente.url}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">não registrada</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Último ping:</span>{" "}
                    {formatUltimoPing(agente.ultimo_ping)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVerificarHealth(agente)}
                    disabled={loading[`health_${agente.id}`] || !agente.url}
                  >
                    {loading[`health_${agente.id}`] ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      "Verificar"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReiniciar(agente)}
                    disabled={loading[agente.id] || !agente.url}
                  >
                    {loading[agente.id] ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      "Atualizar agente"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {agentes.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
            Nenhum agente encontrado. Aplique a migração SQL no Supabase.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Status atualizado automaticamente via Supabase Realtime. Os agentes enviam heartbeat a cada 60s.
      </p>
    </div>
  );
}
