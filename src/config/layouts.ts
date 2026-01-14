import { LayoutType, LayoutConfig, LabelFieldId, FieldPosition } from "@/types/requisicao";

// Campos padrão para todos os layouts
const defaultFields: Record<LabelFieldId, FieldPosition> = {
  medico: { x: 0, y: 70, width: 100, fontSize: 10, visible: true },
  paciente: { x: 0, y: 10, width: 70, fontSize: 11, visible: true },
  requisicao: { x: 70, y: 10, width: 30, fontSize: 10, visible: true },
  formula: { x: 0, y: 18, width: 100, fontSize: 11, visible: true },
  lote: { x: 0, y: 28, width: 25, fontSize: 10, visible: true },
  fabricacao: { x: 25, y: 28, width: 25, fontSize: 10, visible: true },
  validade: { x: 50, y: 28, width: 25, fontSize: 10, visible: true },
  ph: { x: 75, y: 28, width: 25, fontSize: 10, visible: true },
  aplicacao: { x: 50, y: 38, width: 50, fontSize: 10, visible: true },
  tipoUso: { x: 0, y: 38, width: 50, fontSize: 10, visible: true },
  contem: { x: 0, y: 48, width: 60, fontSize: 10, visible: true },
  posologia: { x: 0, y: 80, width: 100, fontSize: 9, visible: true },
  observacoes: { x: 0, y: 88, width: 100, fontSize: 9, visible: true },
  registro: { x: 60, y: 48, width: 40, fontSize: 10, visible: true },
};

// Configurações padrão para cada tipo de layout
export const defaultLayouts: Record<LayoutType, LayoutConfig> = {
  AMP10: {
    tipo: 'AMP10',
    nome: 'Ampola 10',
    campos: { ...defaultFields },
  },
  AMP_CX: {
    tipo: 'AMP_CX',
    nome: 'Ampola Caixa',
    campos: {
      ...defaultFields,
      // Ajustes específicos para caixa (campos mais espaçados)
      paciente: { x: 0, y: 8, width: 65, fontSize: 12, visible: true },
      requisicao: { x: 65, y: 8, width: 35, fontSize: 11, visible: true },
      formula: { x: 0, y: 18, width: 100, fontSize: 12, visible: true },
      lote: { x: 0, y: 30, width: 22, fontSize: 10, visible: true },
      fabricacao: { x: 22, y: 30, width: 22, fontSize: 10, visible: true },
      validade: { x: 44, y: 30, width: 22, fontSize: 10, visible: true },
      ph: { x: 66, y: 30, width: 34, fontSize: 10, visible: true },
    },
  },
  A_PAC_GRAN: {
    tipo: 'A_PAC_GRAN',
    nome: 'Ampola Pacote Grande',
    campos: {
      ...defaultFields,
      // Layout maior com mais espaço
      paciente: { x: 0, y: 5, width: 60, fontSize: 13, visible: true },
      requisicao: { x: 60, y: 5, width: 40, fontSize: 12, visible: true },
      formula: { x: 0, y: 15, width: 100, fontSize: 13, visible: true },
      medico: { x: 0, y: 60, width: 100, fontSize: 11, visible: true },
      posologia: { x: 0, y: 72, width: 100, fontSize: 10, visible: true },
      observacoes: { x: 0, y: 82, width: 100, fontSize: 10, visible: true },
    },
  },
  TIRZ: {
    tipo: 'TIRZ',
    nome: 'Tirzepatida',
    campos: {
      ...defaultFields,
      // Layout específico para Tirzepatida
      paciente: { x: 0, y: 8, width: 100, fontSize: 12, visible: true },
      requisicao: { x: 0, y: 0, width: 100, fontSize: 10, visible: true },
      formula: { x: 0, y: 20, width: 100, fontSize: 14, visible: true },
      medico: { x: 0, y: 65, width: 100, fontSize: 11, visible: true },
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

const STORAGE_KEY = 'label_layouts';

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
