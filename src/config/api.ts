import { ApiConfig, PharmacyConfig, LabelConfig } from "@/types/requisicao";

const STORAGE_KEYS = {
  API_CONFIG: "label-system-api-config",
  PHARMACY_CONFIG: "label-system-pharmacy-config",
  LABEL_CONFIG: "label-system-label-config",
};

// Configurações padrão
const DEFAULT_API_CONFIG: ApiConfig = {
  serverUrl: "http://192.168.6.46:5000",
  codigoFilial: "9",
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
