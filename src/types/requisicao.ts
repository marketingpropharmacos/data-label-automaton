export interface Produto {
  itemId: string;
  codigoProduto: string;
  descricao: string;
  quantidade: string;
  tipoComponente: string;
}

export interface Requisicao {
  id: string;
  nrRequisicao: string;
  nomePaciente: string;
  prefixoCRM: string;
  numeroCRM: string;
  ufCRM: string;
  nomeMedico: string;
  formula: string;
  dataFabricacao: string;
  dataValidade: string;
  numeroRegistro: string;
  posologia: string;
  tipoUso: string;
  volume: string;
  unidadeVolume: string;
  observacoes: string;
  codigoFilial: string;
  produtos: Produto[];
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
