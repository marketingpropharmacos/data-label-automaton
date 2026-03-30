import { ApiConfig, PharmacyConfig, LabelConfig, PrinterConfig, PrintAgentConfig, PrinterCalibrationConfig } from "@/types/requisicao";

export type ModoImpressao = 'rotutx' | 'agente';

const STORAGE_KEYS = {
  API_CONFIG: "label-system-api-config",
  PHARMACY_CONFIG: "label-system-pharmacy-config",
  LABEL_CONFIG: "label-system-label-config",
  PRINTER_CONFIG: "label-system-printer-config",
  PRINT_AGENT_CONFIG: "label-system-print-agent-config",
  MODO_IMPRESSAO: "label-system-modo-impressao",
};

// Configurações padrão
const DEFAULT_API_CONFIG: ApiConfig = {
  serverUrl: "http://192.168.6.46:5000",
  codigoFilial: "279",
};

const DEFAULT_PHARMACY_CONFIG: PharmacyConfig = {
  nome: "Pró Pharmaços",
  endereco: "Endereço da Farmácia",
  telefone: "(00) 0000-0000",
  cnpj: "00.000.000/0001-00",
  farmaceutico: "Farm. Responsável",
  crf: "CRF-XX 0000",
};

const DEFAULT_LABEL_CONFIG: LabelConfig = {
  larguraMM: 80,
  alturaMM: 50,
};

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  nomePC: "Campos2",
  nomeCompartilhamento: "Campos2",
};

const DEFAULT_PRINT_AGENT_CONFIG: PrintAgentConfig = {
  enabled: false,
  agentUrl: "http://192.168.10.105:5001",
  impressora: "argox01",
  calibracao: {
    margem_c: 0,
    offset_r: 0,
    contraste: 14,
    fonte: 2,
    rotacao: 0,
    modo: 'dots',
  },
};

// Funções de persistência
export const getApiConfig = (): ApiConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge com defaults para garantir novos campos
      return { ...DEFAULT_API_CONFIG, ...parsed };
    }
    return DEFAULT_API_CONFIG;
  } catch {
    return DEFAULT_API_CONFIG;
  }
};

export const setApiConfig = (config: ApiConfig): void => {
  localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(config));
};

export const getPharmacyConfig = (): PharmacyConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PHARMACY_CONFIG);
    return stored ? JSON.parse(stored) : DEFAULT_PHARMACY_CONFIG;
  } catch {
    return DEFAULT_PHARMACY_CONFIG;
  }
};

export const setPharmacyConfig = (config: PharmacyConfig): void => {
  localStorage.setItem(STORAGE_KEYS.PHARMACY_CONFIG, JSON.stringify(config));
};

export const getLabelConfig = (): LabelConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LABEL_CONFIG);
    return stored ? JSON.parse(stored) : DEFAULT_LABEL_CONFIG;
  } catch {
    return DEFAULT_LABEL_CONFIG;
  }
};

export const setLabelConfig = (config: LabelConfig): void => {
  localStorage.setItem(STORAGE_KEYS.LABEL_CONFIG, JSON.stringify(config));
};

export const getPrinterConfig = (): PrinterConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRINTER_CONFIG);
    return stored ? JSON.parse(stored) : DEFAULT_PRINTER_CONFIG;
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
};

export const setPrinterConfig = (config: PrinterConfig): void => {
  localStorage.setItem(STORAGE_KEYS.PRINTER_CONFIG, JSON.stringify(config));
};

// getPrinterPath removido - não era utilizado

export const getPrintAgentConfig = (): PrintAgentConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRINT_AGENT_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PRINT_AGENT_CONFIG,
        ...parsed,
        calibracao: {
          ...DEFAULT_PRINT_AGENT_CONFIG.calibracao,
          ...(parsed.calibracao || {}),
        },
      };
    }
    return DEFAULT_PRINT_AGENT_CONFIG;
  } catch {
    return DEFAULT_PRINT_AGENT_CONFIG;
  }
};

export const setPrintAgentConfig = (config: PrintAgentConfig): void => {
  const normalized: PrintAgentConfig = {
    ...DEFAULT_PRINT_AGENT_CONFIG,
    ...config,
    calibracao: {
      ...DEFAULT_PRINT_AGENT_CONFIG.calibracao,
      ...(config.calibracao || {}),
    },
  };
  localStorage.setItem(STORAGE_KEYS.PRINT_AGENT_CONFIG, JSON.stringify(normalized));
};

export const getModoImpressao = (): ModoImpressao => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MODO_IMPRESSAO);
    return (stored === 'agente' ? 'agente' : 'rotutx') as ModoImpressao;
  } catch {
    return 'rotutx';
  }
};

export const setModoImpressao = (modo: ModoImpressao): void => {
  localStorage.setItem(STORAGE_KEYS.MODO_IMPRESSAO, modo);
};

// Mapeamento layout → impressora padrão (configurável por estação)
const LAYOUT_PRINTER_MAP_KEY = 'label-system-layout-printer-map';

export type LayoutPrinterMap = Record<string, string>;

// Defaults hardcoded baseados na realidade física das estações
const DEFAULT_LAYOUT_PRINTER_MAP: LayoutPrinterMap = {
  'A_PAC_PEQ': 'AMP PEQUENA NOVA',
  'A_PAC_GRAN': 'AMP GRANDE',
  'AMP_CX': 'AMP CAIXA',
  'AMP10': 'CAIXA GRANDE',
  'TIRZ': 'PEQUENO',
};

// Mapeamento layout → estação (station id)
const DEFAULT_LAYOUT_STATION_MAP: Record<string, string> = {
  'A_PAC_PEQ': 'edi',
  'A_PAC_GRAN': 'edi',
  'AMP_CX': 'daniel',
  'AMP10': 'daniel',
  'TIRZ': 'edi',
};

export const getLayoutPrinterMap = (): LayoutPrinterMap => {
  try {
    const stored = localStorage.getItem(LAYOUT_PRINTER_MAP_KEY);
    const userMap = stored ? JSON.parse(stored) : {};
    // Merge: user overrides win, defaults fill gaps
    return { ...DEFAULT_LAYOUT_PRINTER_MAP, ...userMap };
  } catch {
    return { ...DEFAULT_LAYOUT_PRINTER_MAP };
  }
};

export const getLayoutStation = (layout: string): string | undefined => {
  try {
    const stored = localStorage.getItem('label-system-layout-station-map');
    if (stored) {
      const map = JSON.parse(stored);
      if (map[layout]) return map[layout];
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUT_STATION_MAP[layout];
};

export const setLayoutPrinterMap = (map: LayoutPrinterMap): void => {
  localStorage.setItem(LAYOUT_PRINTER_MAP_KEY, JSON.stringify(map));
};

export const setLayoutPrinter = (layout: string, printer: string): void => {
  const map = getLayoutPrinterMap();
  map[layout] = printer;
  setLayoutPrinterMap(map);
};

export const getLayoutPrinter = (layout: string): string | undefined => {
  return getLayoutPrinterMap()[layout];
};

// ─── Estações de Impressão (multi-PC) ───
export interface PrintStation {
  id: string;
  nome: string;
  agentUrl: string;
  calibracao?: import("@/types/requisicao").PrinterCalibrationConfig;
}

const STATIONS_KEY = 'label-system-print-stations';
const ACTIVE_STATION_KEY = 'label-system-active-station';

const DEFAULT_STATIONS: PrintStation[] = [
  {
    id: 'edi',
    nome: 'PC da Edi',
    agentUrl: '',
  },
  {
    id: 'daniel',
    nome: 'PC do Daniel',
    agentUrl: 'https://nonethnical-leaden-veda.ngrok-free.dev',
  },
];

export const getPrintStations = (): PrintStation[] => {
  try {
    const stored = localStorage.getItem(STATIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return DEFAULT_STATIONS;
  } catch {
    return DEFAULT_STATIONS;
  }
};

export const setPrintStations = (stations: PrintStation[]): void => {
  localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
};

export const getActiveStationId = (): string => {
  try {
    return localStorage.getItem(ACTIVE_STATION_KEY) || 'edi';
  } catch {
    return 'edi';
  }
};

export const setActiveStationId = (id: string): void => {
  localStorage.setItem(ACTIVE_STATION_KEY, id);
};

export const getActiveStation = (): PrintStation | undefined => {
  const stations = getPrintStations();
  const activeId = getActiveStationId();
  return stations.find(s => s.id === activeId) || stations[0];
};
