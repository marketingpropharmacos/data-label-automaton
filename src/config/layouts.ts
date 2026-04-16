import { LayoutType, LayoutConfig, LabelFieldId, FieldConfig, LineConfig } from "@/types/requisicao";

// Configuração padrão dos campos - tudo fontSize 9, sem bold
const defaultFieldConfig: Record<LabelFieldId, FieldConfig> = {
  paciente: { visible: true, fontSize: 9, bold: false, uppercase: true },
  composicao: { visible: true, fontSize: 9, bold: false, uppercase: true },
  requisicao: { visible: true, fontSize: 9, bold: false, uppercase: false },
  formula: { visible: true, fontSize: 9, bold: false, uppercase: true },
  lote: { visible: true, fontSize: 9, bold: false, uppercase: false },
  fabricacao: { visible: true, fontSize: 9, bold: false, uppercase: false },
  validade: { visible: true, fontSize: 9, bold: false, uppercase: false },
  ph: { visible: true, fontSize: 9, bold: false, uppercase: false },
  tipoUso: { visible: true, fontSize: 9, bold: false, uppercase: true },
  aplicacao: { visible: true, fontSize: 9, bold: false, uppercase: true },
  contem: { visible: true, fontSize: 9, bold: false, uppercase: true },
  registro: { visible: true, fontSize: 9, bold: false, uppercase: false },
  medico: { visible: true, fontSize: 9, bold: false, uppercase: true },
  posologia: { visible: true, fontSize: 9, bold: false, uppercase: false },
  observacoes: { visible: true, fontSize: 9, bold: false, uppercase: false },
};

// Linhas padrão para organização dos campos
const defaultLines: LineConfig[] = [
  { id: 'linha1', campos: ['medico'], spacing: 'normal' },
  { id: 'linha2', campos: ['paciente'], spacing: 'normal' },
  { id: 'linha3', campos: ['composicao'], spacing: 'normal' },
  { id: 'linha4', campos: ['formula'], spacing: 'normal' },
  { id: 'linha5', campos: ['lote', 'fabricacao', 'validade'], spacing: 'compact' },
  { id: 'linha6', campos: ['ph', 'aplicacao', 'contem'], spacing: 'compact' },
  { id: 'linha7', campos: ['tipoUso'], spacing: 'normal' },
  { id: 'linha8', campos: ['posologia'], spacing: 'normal' },
  { id: 'linha9', campos: ['observacoes', 'registro'], spacing: 'compact' },
];

// Campo config base: tudo fontSize 9, sem bold
const baseCampoConfig = (overrides: Partial<Record<LabelFieldId, Partial<FieldConfig>>> = {}): Record<LabelFieldId, FieldConfig> => {
  const base: Record<LabelFieldId, FieldConfig> = {
    paciente: { visible: true, fontSize: 9, bold: false, uppercase: true },
    composicao: { visible: true, fontSize: 9, bold: false, uppercase: true },
    requisicao: { visible: true, fontSize: 9, bold: false, uppercase: false },
    formula: { visible: true, fontSize: 9, bold: false, uppercase: true },
    lote: { visible: true, fontSize: 9, bold: false, uppercase: false },
    fabricacao: { visible: true, fontSize: 9, bold: false, uppercase: false },
    validade: { visible: true, fontSize: 9, bold: false, uppercase: false },
    ph: { visible: true, fontSize: 9, bold: false, uppercase: false },
    tipoUso: { visible: true, fontSize: 9, bold: false, uppercase: true },
    aplicacao: { visible: true, fontSize: 9, bold: false, uppercase: true },
    contem: { visible: true, fontSize: 9, bold: false, uppercase: true },
    registro: { visible: true, fontSize: 9, bold: false, uppercase: false },
    medico: { visible: true, fontSize: 9, bold: false, uppercase: true },
    posologia: { visible: true, fontSize: 9, bold: false, uppercase: false },
    observacoes: { visible: true, fontSize: 9, bold: false, uppercase: false },
  };
  for (const [key, val] of Object.entries(overrides)) {
    base[key as LabelFieldId] = { ...base[key as LabelFieldId], ...val };
  }
  return base;
};

// Configurações padrão para cada tipo de layout
export const defaultLayouts: Record<LayoutType, LayoutConfig> = {
  // Layout 1: AMP_CX (Ampola Caixa) - baseado no ROTULOID AMP.CX do FormulaCerta
  // Mostra: composicao detalhada + observacoes. Sem posologia, sem formula simples.
  AMP_CX: {
    tipo: 'AMP_CX',
    nome: 'Ampola Caixa',
    dimensoes: { larguraMM: 109, alturaMM: 25 },
  colunasMax: 73,
    linhasMax: 10,
    linhas: [
      { id: 'linha1', campos: ['paciente', 'requisicao'], spacing: 'normal' },
      { id: 'linha2', campos: ['medico'], spacing: 'normal' },
      { id: 'linha3', campos: ['composicao'], spacing: 'normal' },
      { id: 'linha4', campos: ['ph', 'lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha5', campos: ['tipoUso', 'aplicacao'], spacing: 'normal' },
      { id: 'linha6', campos: ['contem', 'registro'], spacing: 'normal' },
      { id: 'linha7', campos: ['observacoes'], spacing: 'normal' },
    ],
    campoConfig: baseCampoConfig({
      formula: { visible: false },
      posologia: { visible: false },
    }),
  },

  // Layout 2: AMP10 (Ampola 10) - baseado no ROTULOID AMP10 do FormulaCerta
  // Mostra: formula + posologia. Sem composicao detalhada, sem observacoes.
  AMP10: {
    tipo: 'AMP10',
    nome: 'Ampola 10',
    dimensoes: { larguraMM: 89, alturaMM: 38 },
  colunasMax: 65,
    linhasMax: 10,
    linhas: [
      { id: 'linha1', campos: ['paciente', 'requisicao'], spacing: 'normal' },
      { id: 'linha2', campos: ['medico'], spacing: 'normal' },
      { id: 'linha3', campos: ['formula'], spacing: 'normal' },
      { id: 'linha4', campos: ['posologia'], spacing: 'normal' },
      { id: 'linha5', campos: ['ph', 'lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha6', campos: ['tipoUso', 'aplicacao'], spacing: 'normal' },
      { id: 'linha7', campos: ['contem', 'registro'], spacing: 'normal' },
    ],
    campoConfig: baseCampoConfig({
      composicao: { visible: false },
      observacoes: { visible: false },
    }),
  },

  // Layout 3: A_PAC_PEQ (Ampola Pacote Pequeno) - baseado no ROTULOID A.PAC.PEQ do FormulaCerta
  // Mostra apenas: paciente / requisicao / medico / registro
  A_PAC_PEQ: {
    tipo: 'A_PAC_PEQ',
    nome: 'Ampola Pacote Pequeno',
    dimensoes: { larguraMM: 35, alturaMM: 25 },
    colunasMax: 41,
    linhasMax: 8,
    linhas: [
      { id: 'linha1', campos: ['paciente'], spacing: 'normal' },
      { id: 'linha2', campos: ['requisicao'], spacing: 'normal' },
      { id: 'linha3', campos: ['medico'], spacing: 'normal' },
      { id: 'linha4', campos: ['registro'], spacing: 'normal' },
    ],
    campoConfig: baseCampoConfig({
      composicao: { visible: false },
      formula: { visible: false },
      lote: { visible: false },
      fabricacao: { visible: false },
      validade: { visible: false },
      ph: { visible: false },
      tipoUso: { visible: false },
      aplicacao: { visible: false },
      contem: { visible: false },
      posologia: { visible: false },
      observacoes: { visible: false },
    }),
  },

  // Layout 4: A_PAC_GRAN (Ampola Pacote Grande) - baseado no ROTULOID A.PAC.GRAN do FormulaCerta
  // Mostra apenas: paciente / requisicao / medico / registro
  // Médico quebra em 2 linhas (nome + CRM separados) devido ao colunasMax menor
  A_PAC_GRAN: {
    tipo: 'A_PAC_GRAN',
    nome: 'Ampola Pacote Grande',
    dimensoes: { larguraMM: 76, alturaMM: 25 },
    colunasMax: 73,
    linhasMax: 2,
    linhas: [
      { id: 'linha1', campos: ['paciente'], spacing: 'normal' },
      { id: 'linha2', campos: ['requisicao'], spacing: 'normal' },
      { id: 'linha3', campos: ['medico'], spacing: 'normal' },
      { id: 'linha4', campos: ['registro'], spacing: 'normal' },
    ],
    campoConfig: baseCampoConfig({
      composicao: { visible: false },
      formula: { visible: false },
      lote: { visible: false },
      fabricacao: { visible: false },
      validade: { visible: false },
      ph: { visible: false },
      tipoUso: { visible: false },
      aplicacao: { visible: false },
      contem: { visible: false },
      posologia: { visible: false },
      observacoes: { visible: false },
    }),
  },

  // Layout 5: TIRZ (Tirzepatida) - 7 linhas
  TIRZ: {
    tipo: 'TIRZ',
    nome: 'Tirzepatida',
    dimensoes: { larguraMM: 35, alturaMM: 25 },
    colunasMax: 41,
    linhasMax: 8,
    linhas: [
      { id: 'linha1', campos: ['paciente', 'requisicao'], spacing: 'normal' },
      { id: 'linha2', campos: ['medico'], spacing: 'normal' },
      { id: 'linha3', campos: ['formula'], spacing: 'normal' },
      { id: 'linha4', campos: ['posologia'], spacing: 'normal' },
      { id: 'linha5', campos: ['ph', 'lote', 'fabricacao', 'validade'], spacing: 'compact' },
      { id: 'linha6', campos: ['tipoUso', 'aplicacao'], spacing: 'normal' },
      { id: 'linha7', campos: ['contem', 'registro'], spacing: 'normal' },
    ],
    campoConfig: baseCampoConfig({
      composicao: { visible: false },
      observacoes: { visible: false },
    }),
  },
};

// Labels amigáveis para os campos
export const fieldLabels: Record<LabelFieldId, string> = {
  medico: 'Prescritor',
  paciente: 'Paciente',
  composicao: 'Composição',
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

export const LAYOUTS_STORAGE_KEY = 'label_layouts_v4';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function getLayouts(): Record<LayoutType, LayoutConfig> {
  try {
    const stored = localStorage.getItem(LAYOUTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const merged = {
        ...deepClone(defaultLayouts),
        ...parsed,
      } as Record<LayoutType, LayoutConfig>;

      // Layouts homologados: força a estrutura oficial apenas para layouts com dimensões fixas
      let needsSave = false;
      const frozenLayouts: LayoutType[] = ['A_PAC_PEQ', 'A_PAC_GRAN'];

      frozenLayouts.forEach((tipo) => {
        const current = merged[tipo];
        const defaults = deepClone(defaultLayouts[tipo]);

        if (!current) {
          merged[tipo] = defaults;
          needsSave = true;
          return;
        }

        const shouldResetStructure =
          current.dimensoes?.larguraMM !== defaults.dimensoes.larguraMM ||
          current.dimensoes?.alturaMM !== defaults.dimensoes.alturaMM ||
          current.colunasMax !== defaults.colunasMax ||
          current.linhasMax !== defaults.linhasMax ||
          current.linhas?.length !== defaults.linhas.length;

        if (shouldResetStructure) {
          merged[tipo] = {
            ...current,
            tipo: defaults.tipo,
            nome: defaults.nome,
            dimensoes: deepClone(defaults.dimensoes),
            colunasMax: defaults.colunasMax,
            linhasMax: defaults.linhasMax,
            linhas: deepClone(defaults.linhas),
          };
          needsSave = true;
        }
      });

      // Limpar chaves legadas de versões anteriores
      for (const oldKey of ['label_layouts_v2', 'label_layouts_v3']) {
        localStorage.removeItem(oldKey);
      }

      if (needsSave) {
        localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(merged));
        console.log('[Layouts] Migração v4: estrutura oficial de todos os layouts reaplicada');
      }

      console.log('[Layouts] Carregando layouts do localStorage:', Object.keys(merged));
      return merged;
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
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
    console.log('[Layouts] Layout salvo:', layout.tipo, layout);
  } catch (e) {
    console.error('[Layouts] Erro ao salvar layout:', e);
  }
}

export function resetLayout(tipo: LayoutType): LayoutConfig {
  try {
    const layouts = getLayouts();
    layouts[tipo] = deepClone(defaultLayouts[tipo]);
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(layouts));
    console.log('[Layouts] Layout resetado:', tipo);
    return deepClone(layouts[tipo]);
  } catch (e) {
    console.error('[Layouts] Erro ao resetar layout:', e);
    return deepClone(defaultLayouts[tipo]);
  }
}

export function resetAllLayouts(): void {
  localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(deepClone(defaultLayouts)));
  console.log('[Layouts] Todos layouts resetados');
}

const SELECTED_LAYOUT_KEY = 'selected_layout';

export function getSelectedLayout(): LayoutType {
  try {
    const stored = localStorage.getItem(SELECTED_LAYOUT_KEY);
    if (stored && ['AMP10', 'AMP_CX', 'A_PAC_GRAN', 'A_PAC_PEQ', 'TIRZ'].includes(stored)) {
      return stored as LayoutType;
    }
  } catch (e) {
    console.error('Erro ao carregar layout selecionado:', e);
  }
  return 'AMP_CX';
}

export function setSelectedLayout(tipo: LayoutType): void {
  localStorage.setItem(SELECTED_LAYOUT_KEY, tipo);
}
