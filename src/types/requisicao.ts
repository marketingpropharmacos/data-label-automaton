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
  aplicacao: string;         // Do banco (FC03300 CDICP 00003) - ex: ID/SC, EV, IM
  contem: string;            // Campo manual - ex: 5 FR. DE 2ML
  ph: string;                // Campo manual - ex: 8.0
  quantidade: string;        // QUANT - quantidade de itens
  composicao: string;        // Do banco (FC03300 CDICP 00001-00002) - ativos combinados
  descricaoProduto: string;  // Do banco (FC03300 CDICP 00004) - nome completo do produto
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
