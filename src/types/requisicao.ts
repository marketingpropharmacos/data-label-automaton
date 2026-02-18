// Tipos de Layout disponíveis
export type LayoutType = 'AMP10' | 'AMP_CX' | 'A_PAC_GRAN' | 'A_PAC_PEQ' | 'TIRZ';

// Configuração de um campo (simplificado para sistema de linhas)
export interface FieldConfig {
  visible: boolean;
  fontSize: number;  // tamanho da fonte em px
  bold?: boolean;
  uppercase?: boolean;
}

// Configuração de uma linha do layout
export interface LineConfig {
  id: string;
  campos: LabelFieldId[];  // campos nesta linha, na ordem
  spacing?: 'normal' | 'compact' | 'wide';
}

// Lista de campos disponíveis
export type LabelFieldId = 
  | 'medico'
  | 'paciente'
  | 'composicao'
  | 'requisicao'
  | 'formula'
  | 'lote'
  | 'fabricacao'
  | 'validade'
  | 'ph'
  | 'aplicacao'
  | 'tipoUso'
  | 'contem'
  | 'posologia'
  | 'observacoes'
  | 'registro';

// Configuração completa de um layout (novo formato baseado em linhas)
export interface LayoutConfig {
  tipo: LayoutType;
  nome: string;
  linhas: LineConfig[];  // organização em linhas
  campoConfig: Record<LabelFieldId, FieldConfig>;  // configuração individual de cada campo
  dimensoes?: {  // dimensões específicas do layout em mm
    larguraMM: number;
    alturaMM: number;
  };
  colunasMax?: number;  // limite físico de colunas da impressora
  linhasMax?: number;   // limite físico de linhas da impressora
}

// Manter compatibilidade com formato antigo (deprecado)
// Tipo de item do rótulo
export type TipoItem = 'PRODUTO ÚNICO' | 'MESCLA' | 'KIT';

// Componente individual de um kit
export interface ComponenteKit {
  codigo: string;
  nome: string;
  ph: string;
  lote: string;
  fabricacao: string;
  validade: string;
  composicao?: string;  // Ativos extraídos da FC99999 (ex: "ACIDO TRANEXAMICO 8MG, TGP2 20MG")
  aplicacao?: string;   // Aplicação extraída da OBSFIC (ex: "MICROAGULHAMENTO")
}

export interface FieldPosition {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  visible: boolean;
}

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
  textoLivre?: string;       // Texto editado livremente pelo usuário (bloco de notas)
  tipoItem?: TipoItem;       // Tipo do item: PRODUTO ÚNICO, MESCLA ou KIT
  eSinonimo?: boolean;        // True se o kit foi resolvido via sinônimo (FC03200)
  componentes?: ComponenteKit[];  // Componentes do kit (apenas se tipoItem === 'KIT')
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

export interface PrinterConfig {
  nomePC: string;
  nomeCompartilhamento: string;
}

export interface PrinterCalibrationConfig {
  margem_c: number;   // Cxxxx - margem esquerda (0.1mm)
  offset_r: number;   // Rxxxx - compensação vertical (0.1mm)
  contraste: number;  // Hxx - contraste (10-20)
  fonte: number;      // Font number (0-9, default 2)
  rotacao: number;    // Rotation (0=horizontal, 1=90°, 2=180°, 3=270°)
  modo?: 'mm' | 'dots';  // Modo de coordenadas: 'mm' (milímetros) ou 'dots' (compatível com Fórmula Certa)
}

export interface PrintAgentConfig {
  enabled: boolean;
  agentUrl: string;
  impressora: string;
  calibracao?: PrinterCalibrationConfig;
}

// Fila de impressão (FC12B00)
export interface FilaImpressaoItem {
  nrRequisicao: string;
  serieRotulo: string;
  status: number;
  codigoRotulo: string;
  dataCriacao: string;
  nomePC?: string;
}

// Configuração de impressora (FC90100)
export interface ImpressoraConfig {
  rotuloId: string;
  altura: number;
  largura: number;
  tipoImpressora: string;
  portaRede: string;
  nomePC: string;
}
