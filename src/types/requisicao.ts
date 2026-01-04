export interface Requisicao {
  id: string;
  nrRequisicao: string;
  nomePaciente: string;
  prefixoCRM: string;
  numeroCRM: string;
  ufCRM: string;
  formula: string;
  dataFabricacao: string;
  dataValidade: string;
  numeroRegistro: string;
  posologia: string;
  tipoUso: string;
  volume: string;
  unidadeVolume: string;
  observacoes: string;
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
}
