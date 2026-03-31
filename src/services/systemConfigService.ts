import { supabase } from "@/integrations/supabase/client";
import { ApiConfig, PharmacyConfig } from "@/types/requisicao";
import { PrintStation, LayoutPrinterMap } from "@/config/api";

type ConfigKey =
  | "api_config"
  | "pharmacy_config"
  | "print_stations"
  | "layout_printer_map"
  | "layout_station_map"
  | "modo_impressao";

// ── Read ────────────────────────────────────────────────────────────

async function getConfig<T>(key: ConfigKey): Promise<T | null> {
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return null;
  return data.value as T;
}

// ── Write (admin only) ──────────────────────────────────────────────

async function setConfig<T>(key: ConfigKey, value: T): Promise<boolean> {
  const { error } = await supabase
    .from("system_config")
    .upsert(
      { key, value: value as any, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    console.error(`[SystemConfig] Erro ao salvar ${key}:`, error);
    return false;
  }
  return true;
}

// ── Public API ──────────────────────────────────────────────────────

export const SystemConfigService = {
  // Load all configs and apply to localStorage (called on login)
  async syncToLocalStorage(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("key, value");

      if (error || !data || data.length === 0) {
        console.warn("[SystemConfig] Nenhuma config encontrada no Supabase, usando defaults locais");
        return;
      }

      const STORAGE_MAP: Record<string, string> = {
        api_config: "label-system-api-config",
        pharmacy_config: "label-system-pharmacy-config",
        print_stations: "label-system-print-stations",
        layout_printer_map: "label-system-layout-printer-map",
        print_agent_config: "label-system-print-agent-config",
        modo_impressao: "label-system-modo-impressao",
      };

      for (const row of data) {
        const storageKey = STORAGE_MAP[row.key];
        if (!storageKey) continue;

        if (row.key === "modo_impressao") {
          // modo_impressao is stored as a JSON string value
          const val = typeof row.value === "string" ? row.value : JSON.stringify(row.value).replace(/"/g, "");
          localStorage.setItem(storageKey, val);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(row.value));
        }
      }

      // Handle layout_station_map separately (used by getLayoutStation)
      const stationMap = data.find((r) => r.key === "layout_station_map");
      if (stationMap) {
        localStorage.setItem("label-system-layout-station-map", JSON.stringify(stationMap.value));
      }

      // Injetar URLs ao vivo dos agentes (agentes_status) nas print_stations
      // Isso garante que operadores sempre recebam a URL correta do ngrok sem configurar nada
      try {
        const { data: agentes } = await supabase
          .from("agentes_status")
          .select("id, url, status, ultimo_ping");

        if (agentes && agentes.length > 0) {
          const stationsRaw = localStorage.getItem("label-system-print-stations");
          const stations: PrintStation[] = stationsRaw ? JSON.parse(stationsRaw) : [];

          const now = Date.now();
          let updated = false;

          const merged = stations.map((station) => {
            const agente = agentes.find((a) => a.id === station.id);
            if (!agente?.url) return station;

            // Só atualiza se o agente pingou nos últimos 5 minutos
            const pingAge = agente.ultimo_ping
              ? (now - new Date(agente.ultimo_ping).getTime()) / 1000
              : Infinity;
            if (pingAge > 300) return station;

            if (station.agentUrl !== agente.url) updated = true;
            return { ...station, agentUrl: agente.url };
          });

          if (updated) {
            localStorage.setItem("label-system-print-stations", JSON.stringify(merged));
            console.log("[SystemConfig] URLs dos agentes atualizadas via agentes_status");
          }
        }
      } catch (urlErr) {
        console.warn("[SystemConfig] Não foi possível atualizar URLs dos agentes:", urlErr);
      }

      console.log("[SystemConfig] Configs sincronizadas do Supabase → localStorage");
    } catch (err) {
      console.error("[SystemConfig] Erro ao sincronizar configs:", err);
    }
  },

  // Save individual configs (admin)
  saveApiConfig: (config: ApiConfig) => setConfig("api_config", config),
  savePharmacyConfig: (config: PharmacyConfig) => setConfig("pharmacy_config", config),
  savePrintStations: (stations: PrintStation[]) => setConfig("print_stations", stations),
  saveLayoutPrinterMap: (map: LayoutPrinterMap) => setConfig("layout_printer_map", map),
  saveLayoutStationMap: (map: Record<string, string>) => setConfig("layout_station_map", map),
  saveModoImpressao: (modo: string) => setConfig("modo_impressao", modo),

  // Read individual configs
  getApiConfig: () => getConfig<ApiConfig>("api_config"),
  getPharmacyConfig: () => getConfig<PharmacyConfig>("pharmacy_config"),
  getPrintStations: () => getConfig<PrintStation[]>("print_stations"),
  getLayoutPrinterMap: () => getConfig<LayoutPrinterMap>("layout_printer_map"),
  getLayoutStationMap: () => getConfig<Record<string, string>>("layout_station_map"),

  // Save all current localStorage configs to Supabase (admin bulk save)
  async pushLocalStorageToSupabase(): Promise<boolean> {
    try {
      const keys: { configKey: ConfigKey; storageKey: string }[] = [
        { configKey: "api_config", storageKey: "label-system-api-config" },
        { configKey: "pharmacy_config", storageKey: "label-system-pharmacy-config" },
        { configKey: "print_stations", storageKey: "label-system-print-stations" },
        { configKey: "layout_printer_map", storageKey: "label-system-layout-printer-map" },
        { configKey: "modo_impressao", storageKey: "label-system-modo-impressao" },
      ];

      for (const { configKey, storageKey } of keys) {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;

        let value: any;
        try {
          value = JSON.parse(raw);
        } catch {
          value = raw; // modo_impressao is plain string
        }

        await setConfig(configKey, value);
      }

      console.log("[SystemConfig] localStorage → Supabase OK");
      return true;
    } catch (err) {
      console.error("[SystemConfig] Erro ao enviar configs:", err);
      return false;
    }
  },
};
