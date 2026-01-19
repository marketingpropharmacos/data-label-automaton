import { LayoutType, LayoutConfig, LabelFieldId, FieldConfig, LineConfig } from "@/types/requisicao";

// Configuração padrão dos campos
const defaultFieldConfig: Record<LabelFieldId, FieldConfig> = {
  paciente: { visible: true, fontSize: 10, bold: true, uppercase: true },
  requisicao: { visible: true, fontSize: 9, bold: false, uppercase: false },
  formula: { visible: true, fontSize: 11, bold: true, uppercase: true },
  lote: { visible: true, fontSize: 9, bold: false, uppercase: false },
  fabricacao: { visible: true, fontSize: 9, bold: false, uppercase: false },
  validade: { visible: true, fontSize: 9, bold: false, uppercase: false },
  ph: { visible: true, fontSize: 9, bold: false, uppercase: false },
  tipoUso: { visible: true, fontSize: 9, bold: false, uppercase: true },
  aplicacao: { visible: true, fontSize: 9, bold: true, uppercase: true },
  contem: { visible: true, fontSize: 9, bold: false, uppercase: true },
  registro: { visible: true, fontSize: 8, bold: false, uppercase: false },
  medico: { visible: true, fontSize: 9, bold: false, uppercase: true },
  posologia: { visible: true, fontSize: 8, bold: false, uppercase: false },
  observacoes: { visible: true, fontSize: 8, bold: false, uppercase: false },
};

// Linhas padrão para organização dos campos - ordem lógica e limpa
const defaultLines: LineConfig[] = [
  { id: 'linha1', campos: ['medico'], spacing: 'normal' },
  { id: 'linha2', campos: ['paciente'], spacing: 'normal' },
  { id: 'linha3', campos: ['formula'], spacing: 'normal' },
  { id: 'linha4', campos: ['lote', 'fabricacao', 'validade'], spacing: 'compact' },
  { id: 'linha5', campos: ['ph', 'aplicacao', 'contem'], spacing: 'compact' },
  { id: 'linha6', campos: ['tipoUso'], spacing: 'normal' },
  { id: 'linha7', campos: ['posologia'], spacing: 'normal' },
  { id: 'linha8', campos: ['observacoes', 'registro'], spacing: 'compact' },
];

// Configurações padrão para cada tipo de layout
export const defaultLayouts: Record<LayoutType, LayoutConfig> = {
  AMP10: {
    tipo: 'AMP10',
    nome: 'Ampola 10',
    linhas: [...defaultLines],
    campoConfig: { ...defaultFieldConfig },
  },
  AMP_CX: {
    tipo: 'AMP_CX',
    nome: 'Ampola Caixa',
    linhas: [
      { id: 'linha1', campos: ['medico'], spacing: 'normal' },
      { id: 'linha2', campos: ['paciente'], spacing: 'normal' },
      { id: 'linha3', campos: ['formula'], spacing: 'wide' },
      { id: 'linha4', campos: ['lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha5', campos: ['ph', 'aplicacao', 'contem'], spacing: 'compact' },
      { id: 'linha6', campos: ['tipoUso'], spacing: 'normal' },
      { id: 'linha7', campos: ['posologia'], spacing: 'normal' },
      { id: 'linha8', campos: ['observacoes', 'registro'], spacing: 'compact' },
    ],
    campoConfig: {
      ...defaultFieldConfig,
      paciente: { visible: true, fontSize: 11, bold: true, uppercase: true },
      formula: { visible: true, fontSize: 12, bold: true, uppercase: true },
    },
  },
  A_PAC_GRAN: {
    tipo: 'A_PAC_GRAN',
    nome: 'Ampola Pacote Grande',
    linhas: [
      { id: 'linha1', campos: ['medico'], spacing: 'normal' },
      { id: 'linha2', campos: ['paciente'], spacing: 'wide' },
      { id: 'linha3', campos: ['formula'], spacing: 'wide' },
      { id: 'linha4', campos: ['lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha5', campos: ['ph', 'aplicacao', 'contem'], spacing: 'compact' },
      { id: 'linha6', campos: ['tipoUso'], spacing: 'normal' },
      { id: 'linha7', campos: ['posologia'], spacing: 'normal' },
      { id: 'linha8', campos: ['observacoes', 'registro'], spacing: 'compact' },
    ],
    campoConfig: {
      ...defaultFieldConfig,
      paciente: { visible: true, fontSize: 12, bold: true, uppercase: true },
      formula: { visible: true, fontSize: 13, bold: true, uppercase: true },
      medico: { visible: true, fontSize: 10, bold: false, uppercase: true },
    },
  },
  TIRZ: {
    tipo: 'TIRZ',
    nome: 'Tirzepatida',
    linhas: [
      { id: 'linha1', campos: ['medico'], spacing: 'normal' },
      { id: 'linha2', campos: ['paciente'], spacing: 'wide' },
      { id: 'linha3', campos: ['formula'], spacing: 'wide' },
      { id: 'linha4', campos: ['lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha5', campos: ['ph', 'aplicacao', 'contem'], spacing: 'compact' },
      { id: 'linha6', campos: ['tipoUso'], spacing: 'normal' },
      { id: 'linha7', campos: ['posologia'], spacing: 'normal' },
    ],
    campoConfig: {
      ...defaultFieldConfig,
      paciente: { visible: true, fontSize: 11, bold: true, uppercase: true },
      formula: { visible: true, fontSize: 13, bold: true, uppercase: true },
      observacoes: { visible: false, fontSize: 8, bold: false, uppercase: false },
    },
  },
};

// Labels amigáveis para os campos
export const fieldLabels: Record<LabelFieldId, string> = {
  medico: 'Médico',
  paciente: 'Paciente',
  requisicao: 'Requisição',
  formula: 'Fórmula',
  lote: 'Lote',
  fabricacao: 'Fabricação',
  validade: 'Validade',
  ph: 'pH',
  aplicacao: 'Aplicação',
  tipoUso: 'Tipo de Uso',
  contem: 'Contém',
  posologia: 'Posologia',
  observacoes: 'Observações',
  registro: 'Registro',
};

const STORAGE_KEY = 'label_layouts_v2';

// Função auxiliar para deep clone
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Funções para persistência
export function getLayouts(): Record<LayoutType, LayoutConfig> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[Layouts] Carregando layouts do localStorage:', Object.keys(parsed));
      return parsed;
    }
  } catch (e) {
    console.error('[Layouts] Erro ao carregar layouts:', e);
  }
  console.log('[Layouts] Usando layouts padrão');
  return deepClone(defaultLayouts);
}

export function getLayout(tipo: LayoutType): LayoutConfig {
  const layouts = getLayouts();
  return layouts[tipo] || deepClone(defaultLayouts[tipo]);
}

export function saveLayout(layout: LayoutConfig): void {
  try {
    const layouts = getLayouts();
    layouts[layout.tipo] = deepClone(layout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    console.log('[Layouts] Layout salvo:', layout.tipo, layout);
  } catch (e) {
    console.error('[Layouts] Erro ao salvar layout:', e);
  }
}

export function resetLayout(tipo: LayoutType): LayoutConfig {
  try {
    const layouts = getLayouts();
    layouts[tipo] = deepClone(defaultLayouts[tipo]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    console.log('[Layouts] Layout resetado:', tipo);
    return deepClone(layouts[tipo]);
  } catch (e) {
    console.error('[Layouts] Erro ao resetar layout:', e);
    return deepClone(defaultLayouts[tipo]);
  }
}

export function resetAllLayouts(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deepClone(defaultLayouts)));
  console.log('[Layouts] Todos layouts resetados');
}

// Layout selecionado atualmente
const SELECTED_LAYOUT_KEY = 'selected_layout';

export function getSelectedLayout(): LayoutType {
  try {
    const stored = localStorage.getItem(SELECTED_LAYOUT_KEY);
    if (stored && ['AMP10', 'AMP_CX', 'A_PAC_GRAN', 'TIRZ'].includes(stored)) {
      return stored as LayoutType;
    }
  } catch (e) {
    console.error('Erro ao carregar layout selecionado:', e);
  }
  return 'AMP10';
}

export function setSelectedLayout(tipo: LayoutType): void {
  localStorage.setItem(SELECTED_LAYOUT_KEY, tipo);
}
