// Rótulo individual por fórmula (cada aba do Fórmula Certa)
export interface RotuloItem {
  id: string;
  nrRequisicao: string;
  nrItem: string;
  nomePaciente: string;
  prefixoCRM: string;
  numeroCRM: string;
  ufCRM: string;
  nomeMedico: string;
  formula: string;           // TITROT - nome da fórmula (Lidocaína, Água, Alopécia)
  dataFabricacao: string;
  dataValidade: string;
  numeroRegistro: string;
  posologia: string;
  tipoUso: string;
  volume: string;
  unidadeVolume: string;
  observacoes: string;
  lote: string;              // NRLOT - número do lote
}

export interface PharmacyConfig {
  nome: string;
  endereco: string;
  telefone: string;
  cnpj: string;
  farmaceutico: string;
  crf: string;
}

export interface LabelConfig {
  larguraMM: number;
  alturaMM: number;
}

export interface ApiConfig {
  serverUrl: string;
  codigoFilial: string;
}
