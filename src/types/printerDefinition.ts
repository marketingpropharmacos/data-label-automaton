import { LayoutType } from "./requisicao";

export type TipoImpressora = 'matricial' | 'jato_de_tinta' | 'laser' | 'termica';
export type TipoFormulario = 'continuo' | 'folha_solta' | 'bobina';
export type TipoModelo = 'epson' | 'hp' | 'rima' | 'grafico' | 'personalizado';
export type Gabarito = 6 | 8 | 12 | 16;
export type CaracterPadrao = 5 | 10 | 12 | 17 | 20;
export type UnidadeMedida = 'pol' | 'mm';
export type Velocidade = 'MINIMA' | 'MEDIA' | 'MAXIMA';

// Mapeamento de fontes PPLA conforme Fórmula Certa
export interface FontePPLA {
  id: number;
  tamanhoMM: string;
  compatibilidade: string;
}

export const FONTES_PPLA: FontePPLA[] = [
  { id: 0, tamanhoMM: '1,5mm', compatibilidade: 'Zebra' },
  { id: 1, tamanhoMM: '2mm', compatibilidade: 'Eltron/Toshiba/Zebra' },
  { id: 2, tamanhoMM: '2,5mm', compatibilidade: 'Eltron/Toshiba/Zebra' },
  { id: 3, tamanhoMM: '3,5mm', compatibilidade: 'Eltron/Toshiba/Zebra' },
  { id: 4, tamanhoMM: '4,5mm', compatibilidade: 'Eltron/Toshiba/Zebra' },
  { id: 5, tamanhoMM: '6,5mm', compatibilidade: 'Eltron/Toshiba/Zebra' },
  { id: 6, tamanhoMM: '8,5mm', compatibilidade: 'Zebra' },
  { id: 7, tamanhoMM: '3mm', compatibilidade: 'Zebra' },
  { id: 8, tamanhoMM: '3,5mm', compatibilidade: 'Zebra' },
];

export interface PrinterDefinition {
  nome: string;
  layoutType: LayoutType;
  impressora: TipoImpressora;
  gabarito: Gabarito;
  formulario: TipoFormulario;
  modelo: TipoModelo;
  caracterPadrao: CaracterPadrao;
  medidas: {
    unidade: UnidadeMedida;
    largura: number;
    altura: number;
    margemSuperior: number;
    margemEsquerda: number;
    nCarreiras: number;
    nLinhasEtiquetas: number;
    espacoEntreColunas: number;
    espacoEntreLinhas: number;
    saltoRabbit: number;
    velocidade: Velocidade;
  };
  impressaoLocal: string;
  impressaoRede: string;
  fonte: number;
  rotacaoFonte: number;
  marcaImpressora: string;
  permitirImpressaoSemComponentes: boolean;
  usarGerenciadorImpressao: boolean;
  desconsiderarImpressaoLocal: boolean;
}

// Valores padrão por layout (baseados no Fórmula Certa)
export const DEFAULT_DEFINITIONS: Record<LayoutType, PrinterDefinition> = {
  A_PAC_PEQ: {
    nome: 'A.PAC.PEQ',
    layoutType: 'A_PAC_PEQ',
    impressora: 'termica',
    gabarito: 8,
    formulario: 'bobina',
    modelo: 'personalizado',
    caracterPadrao: 20,
    medidas: {
      unidade: 'pol',
      largura: 1.39,
      altura: 1,
      margemSuperior: 0,
      margemEsquerda: 0,
      nCarreiras: 1,
      nLinhasEtiquetas: 0,
      espacoEntreColunas: 0,
      espacoEntreLinhas: 0,
      saltoRabbit: 1.16,
      velocidade: 'MINIMA',
    },
    impressaoLocal: 'LPT1',
    impressaoRede: '',
    fonte: 1,
    rotacaoFonte: 0,
    marcaImpressora: '',
    permitirImpressaoSemComponentes: false,
    usarGerenciadorImpressao: true,
    desconsiderarImpressaoLocal: true,
  },
  AMP_CX: {
    nome: 'AMP.CX',
    layoutType: 'AMP_CX',
    impressora: 'termica',
    gabarito: 8,
    formulario: 'bobina',
    modelo: 'personalizado',
    caracterPadrao: 20,
    medidas: {
      unidade: 'pol',
      largura: 4.29,
      altura: 1,
      margemSuperior: 0,
      margemEsquerda: 0,
      nCarreiras: 1,
      nLinhasEtiquetas: 0,
      espacoEntreColunas: 0,
      espacoEntreLinhas: 0,
      saltoRabbit: 1.16,
      velocidade: 'MINIMA',
    },
    impressaoLocal: 'LPT1',
    impressaoRede: '',
    fonte: 2,
    rotacaoFonte: 0,
    marcaImpressora: '',
    permitirImpressaoSemComponentes: false,
    usarGerenciadorImpressao: true,
    desconsiderarImpressaoLocal: true,
  },
  AMP10: {
    nome: 'AMP10',
    layoutType: 'AMP10',
    impressora: 'termica',
    gabarito: 8,
    formulario: 'bobina',
    modelo: 'personalizado',
    caracterPadrao: 20,
    medidas: {
      unidade: 'pol',
      largura: 3.50,
      altura: 1.50,
      margemSuperior: 0,
      margemEsquerda: 0,
      nCarreiras: 1,
      nLinhasEtiquetas: 0,
      espacoEntreColunas: 0,
      espacoEntreLinhas: 0,
      saltoRabbit: 1.16,
      velocidade: 'MINIMA',
    },
    impressaoLocal: 'LPT1',
    impressaoRede: '',
    fonte: 2,
    rotacaoFonte: 0,
    marcaImpressora: '',
    permitirImpressaoSemComponentes: false,
    usarGerenciadorImpressao: true,
    desconsiderarImpressaoLocal: true,
  },
  A_PAC_GRAN: {
    nome: 'A.PAC.GRAN',
    layoutType: 'A_PAC_GRAN',
    impressora: 'termica',
    gabarito: 8,
    formulario: 'bobina',
    modelo: 'personalizado',
    caracterPadrao: 20,
    medidas: {
      unidade: 'pol',
      largura: 2.99,
      altura: 1,
      margemSuperior: 0,
      margemEsquerda: 0,
      nCarreiras: 1,
      nLinhasEtiquetas: 0,
      espacoEntreColunas: 0,
      espacoEntreLinhas: 0,
      saltoRabbit: 1.16,
      velocidade: 'MINIMA',
    },
    impressaoLocal: 'LPT1',
    impressaoRede: '',
    fonte: 1,
    rotacaoFonte: 0,
    marcaImpressora: '',
    permitirImpressaoSemComponentes: false,
    usarGerenciadorImpressao: true,
    desconsiderarImpressaoLocal: true,
  },
  TIRZ: {
    nome: 'TIRZ',
    layoutType: 'TIRZ',
    impressora: 'termica',
    gabarito: 8,
    formulario: 'bobina',
    modelo: 'personalizado',
    caracterPadrao: 20,
    medidas: {
      unidade: 'pol',
      largura: 1.39,
      altura: 1,
      margemSuperior: 0,
      margemEsquerda: 0,
      nCarreiras: 1,
      nLinhasEtiquetas: 0,
      espacoEntreColunas: 0,
      espacoEntreLinhas: 0,
      saltoRabbit: 1.16,
      velocidade: 'MINIMA',
    },
    impressaoLocal: 'LPT1',
    impressaoRede: '',
    fonte: 1,
    rotacaoFonte: 0,
    marcaImpressora: '',
    permitirImpressaoSemComponentes: false,
    usarGerenciadorImpressao: true,
    desconsiderarImpressaoLocal: true,
  },
};

const STORAGE_KEY = 'printer_definitions_v1';

export function getDefinitions(): Record<LayoutType, PrinterDefinition> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults for new fields
      const result: Record<string, PrinterDefinition> = {};
      for (const key of Object.keys(DEFAULT_DEFINITIONS)) {
        result[key] = { ...DEFAULT_DEFINITIONS[key as LayoutType], ...(parsed[key] || {}) };
      }
      return result as Record<LayoutType, PrinterDefinition>;
    }
  } catch (e) {
    console.error('[Definitions] Erro ao carregar:', e);
  }
  return { ...DEFAULT_DEFINITIONS };
}

export function getDefinition(tipo: LayoutType): PrinterDefinition {
  return getDefinitions()[tipo];
}

export function saveDefinition(def: PrinterDefinition): void {
  const defs = getDefinitions();
  defs[def.layoutType] = { ...def };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
}

export function resetDefinition(tipo: LayoutType): PrinterDefinition {
  const defs = getDefinitions();
  defs[tipo] = { ...DEFAULT_DEFINITIONS[tipo] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
  return defs[tipo];
}
