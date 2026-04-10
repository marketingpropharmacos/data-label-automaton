/**
 * Templates de rótulo estilo Fórmula Certa
 * Cada template define a grade de caracteres com placeholders @X
 * 
 * Placeholders:
 * @P = Paciente
 * @R = Requisição (nrRequisicao-nrItem)
 * @M = Médico (nome)
 * @C = CRM (prefixo + número + UF)
 * @G = Registro (numeroRegistro)
 * @F = Fórmula/Composição
 * @L = Lote
 * @D = Fabricação (data)
 * @V = Validade (data)
 * @H = pH
 * @U = Tipo de Uso
 * @A = Aplicação
 * @N = Contém
 * @O = Posologia
 * @X = Texto Livre (editável)
 */

import { LayoutType } from "@/types/requisicao";

// Mapeamento de código de placeholder → nome do campo
export const FIELD_CODES: Record<string, { label: string; dataKey: string; color: string }> = {
  P: { label: 'Paciente', dataKey: 'nomePaciente', color: '#22c55e' },       // green
  R: { label: 'Requisição', dataKey: 'requisicao', color: '#3b82f6' },      // blue
  M: { label: 'Médico', dataKey: 'nomeMedico', color: '#a855f7' },          // purple
  C: { label: 'CRM', dataKey: 'crm', color: '#f97316' },                    // orange
  G: { label: 'Registro', dataKey: 'numeroRegistro', color: '#ef4444' },    // red
  F: { label: 'Fórmula', dataKey: 'formula', color: '#06b6d4' },            // cyan
  L: { label: 'Lote', dataKey: 'lote', color: '#eab308' },                  // yellow
  D: { label: 'Fabricação', dataKey: 'dataFabricacao', color: '#84cc16' },   // lime
  V: { label: 'Validade', dataKey: 'dataValidade', color: '#f43f5e' },      // rose
  H: { label: 'pH', dataKey: 'ph', color: '#14b8a6' },                      // teal
  U: { label: 'Tipo Uso', dataKey: 'tipoUso', color: '#8b5cf6' },           // violet
  A: { label: 'Aplicação', dataKey: 'aplicacao', color: '#f59e0b' },        // amber
  N: { label: 'Contém', dataKey: 'contem', color: '#10b981' },              // emerald
  O: { label: 'Posologia', dataKey: 'posologia', color: '#6366f1' },        // indigo
  X: { label: 'Texto Livre', dataKey: 'textoLivre', color: '#64748b' },     // slate
};

// Templates padrão por layout (baseados no Fórmula Certa)
export const DEFAULT_TEMPLATES: Record<LayoutType, string[]> = {
  A_PAC_PEQ: [
    '@PPPPPPPPPPPPPPPPPPPPPPPPPP',
    'REQ:@RRRRRRRRR',
    'DR(A)@MMMMMMMMMMMMMMMMMMMM',
    '@CCCCCCCCCCCCCCCCCCCCCCCCCC',
    '           REG:@GGGGGGGGGG',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  AMP_CX: [
    '@PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP REQ:@RRRRRRRRRRRRR',
    'DR. @MMMMMMMMMMMMMMMMMMMMMMMMMM CRM @CCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    '@FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'pH:@HH L:@LLLLLL F:@DDDDDD V:@VVVVVV',
    '@UUUUUUUUUUUUUUUUUUUUU APLICACAO: @AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'CONTEM: @NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN REG:@GGGGGGGGG',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  AMP10: [
    '@PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP REQ:@RRRRRRRRRRRRRRRR',
    'DR. @MMMMMMMMMMMMMMMMMMMMMMMMMM CRM @CCCCCCCCCCCCCCCCCCCCCCCCC',
    '@FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    '@FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'REG: @GGGGGGGGGGG',
    'pH:@HH L:@LLLLLL V:@VVVVVV APLIC: @AAAAAAAAAAAAAAAAAAA',
    '@UUUUUUUUUUUUUUUUUUUU @OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  A_PAC_GRAN: [
    '@PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP REQ:@RRRRRRRRRRRRR',
    'DR. @MMMMMMMMMMMMMMMMMMMMMMMMMM @CCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    '                                                     REG:@GGGGGGGGGGGGGGG',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  TIRZ: [
    '@PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP REQ:@RRRRRRRRRRRRR',
    'DR. @MMMMMMMMMMMMMMMMMMMMMMMMMM CRM @CCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    '@FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    '@OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    'pH:@HH L:@LLLLLL F:@DDDDDD V:@VVVVVV',
    '@UUUUUUUUUUUUUUUUUUUUU APLICACAO: @AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'CONTEM: @NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN REG:@GGGGGGGGG',
    '@XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
};

// Layout info para o editor
export const LAYOUT_INFO: Record<LayoutType, { cols: number; rows: number; lpp: number; cpp: number }> = {
  A_PAC_PEQ: { cols: 28, rows: 8, lpp: 8, cpp: 20 },
  AMP_CX: { cols: 73, rows: 8, lpp: 8, cpp: 20 },
  AMP10: { cols: 65, rows: 10, lpp: 8, cpp: 20 },
  A_PAC_GRAN: { cols: 73, rows: 8, lpp: 8, cpp: 20 },
  TIRZ: { cols: 73, rows: 8, lpp: 8, cpp: 20 },
};

const cloneTemplates = (templates: Record<LayoutType, string[]>): Record<LayoutType, string[]> => {
  return Object.fromEntries(
    Object.entries(templates).map(([layout, lines]) => [layout, [...lines]])
  ) as Record<LayoutType, string[]>;
};

// Parse de template: extrai segmentos de campo e texto estático
export interface TemplateSegment {
  type: 'field' | 'text';
  content: string;
  fieldCode?: string;
  width: number;
  startCol: number;
}

export function parseTemplateLine(line: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let i = 0;
  let col = 0;

  while (i < line.length) {
    if (line[i] === '@' && i + 1 < line.length && /[A-Z]/.test(line[i + 1])) {
      const fieldCode = line[i + 1];
      let width = 0;
      const start = i;
      // Count consecutive same-code characters after @
      i += 1; // skip @
      while (i < line.length && line[i] === fieldCode) {
        width++;
        i++;
      }
      segments.push({ type: 'field', content: line.substring(start, start + 1 + width), fieldCode, width, startCol: col });
      col += 1 + width; // @ + repeated chars
    } else {
      // Static text
      const start = i;
      while (i < line.length && !(line[i] === '@' && i + 1 < line.length && /[A-Z]/.test(line[i + 1]))) {
        i++;
      }
      const text = line.substring(start, i);
      segments.push({ type: 'text', content: text, width: text.length, startCol: col });
      col += text.length;
    }
  }

  return segments;
}

// Preencher template com dados reais
export function fillTemplate(templateLines: string[], data: Record<string, string>): string[] {
  return templateLines.map(line => {
    const segments = parseTemplateLine(line);
    return segments.map(seg => {
      if (seg.type === 'field' && seg.fieldCode) {
        const fieldInfo = FIELD_CODES[seg.fieldCode];
        if (fieldInfo) {
          const value = (data[fieldInfo.dataKey] || '').toUpperCase();
          // Pad or truncate to exact field width
          return value.substring(0, seg.width).padEnd(seg.width, ' ');
        }
      }
      return seg.content;
    }).join('');
  });
}

// Storage
const TEMPLATES_KEY = 'fc_label_templates_v1';
const FROZEN_TEMPLATE_LAYOUTS: LayoutType[] = ['A_PAC_PEQ', 'A_PAC_GRAN'];

export function getTemplates(): Record<LayoutType, string[]> {
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<Record<LayoutType, string[]>>;
      const merged = {
        ...cloneTemplates(DEFAULT_TEMPLATES),
        ...parsed,
      } as Record<LayoutType, string[]>;

      let needsSave = false;

      FROZEN_TEMPLATE_LAYOUTS.forEach((layout) => {
        const defaults = DEFAULT_TEMPLATES[layout];
        const current = merged[layout];
        const shouldReset = JSON.stringify(current) !== JSON.stringify(defaults);

        if (shouldReset) {
          merged[layout] = [...defaults];
          needsSave = true;
        }
      });

      if (needsSave) {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(merged));
        console.log('[Templates] Migração: templates homologados reaplicados para A_PAC_PEQ/A_PAC_GRAN');
      }

      return cloneTemplates(merged);
    }
  } catch {}
  return cloneTemplates(DEFAULT_TEMPLATES);
}

export function getTemplate(layout: LayoutType): string[] {
  const all = getTemplates();
  return all[layout] || DEFAULT_TEMPLATES[layout] || [];
}

export function saveTemplate(layout: LayoutType, lines: string[]): void {
  const all = getTemplates();
  all[layout] = lines;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(all));
}

export function resetTemplate(layout: LayoutType): string[] {
  const lines = DEFAULT_TEMPLATES[layout] || [];
  saveTemplate(layout, lines);
  return lines;
}
