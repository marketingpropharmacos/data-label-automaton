/**
 * Templates PPLA brutos e literais por layout.
 *
 * Regras:
 * - Não interpretar, não reformatar, não "corrigir" e não reconstruir o PPLA.
 * - Apenas gerar exatamente o texto do template, preservando todos os comandos,
 *   quebras de linha e caracteres especiais.
 * - O caractere STX (\x02) deve ser mantido exatamente como está no início dos comandos.
 * - O final Q0001E deve ser mantido exatamente assim, sem alterar.
 * - Cada layout tem estrutura fixa. Só os valores textuais devem ser substituídos.
 * - Os prefixos numéricos antes dos textos são fixos por campo e por layout.
 *   Não podem ser recalculados nem alterados.
 * - Não concatenar linhas, não separar comandos e não mudar encoding.
 * - Campos variáveis preenchidos por interpolação simples.
 */

import { LayoutType, RotuloItem } from "@/types/requisicao";

// ─── Tipos ────────────────────────────────────────────────

export interface PPLATemplateField {
  key: string;
  prefix: string;   // prefixo numérico fixo (ex: "111100000890012")
  label?: string;    // prefixo textual antes do valor (ex: "REQ:", "DR(A)")
}

export interface PPLATemplate {
  layout: LayoutType;
  header: string[];          // linhas de cabeçalho (f..., L, e)
  config: string[];          // linhas de configuração (PA/PB, D11, H14)
  fields: PPLATemplateField[];  // campos na ordem exata
  footer: string;            // "Q0001E"
}

// ─── STX character ────────────────────────────────────────
const STX = "\x02";

// ─── Templates brutos ─────────────────────────────────────

const PPLA_TEMPLATES: Record<LayoutType, PPLATemplate> = {
  A_PAC_PEQ: {
    layout: "A_PAC_PEQ",
    header: [`${STX}f289`, `${STX}L`, `${STX}e`],
    config: [`${STX}PA`, `${STX}D11`, `${STX}H14`],
    fields: [
      { key: "cliente",       prefix: "111100000890012" },
      { key: "req",           prefix: "111100000890116", label: "REQ:" },
      { key: "profissional",  prefix: "111100000780012", label: "DR(A)" },
      { key: "registro",      prefix: "111100000670129", label: "REG:" },
    ],
    footer: `${STX}Q0001E`,
  },

  A_PAC_GRAN: {
    layout: "A_PAC_GRAN",
    header: [`${STX}f289`, `${STX}L`, `${STX}e`],
    config: [`${STX}PA`, `${STX}D11`, `${STX}H14`],
    fields: [
      { key: "cliente",       prefix: "111100000890012" },
      { key: "req",           prefix: "111100000890240", label: "REQ:" },
      { key: "profissional",  prefix: "111100000780012", label: "DR(A)" },
      { key: "crm",           prefix: "111100000780230" },
      { key: "registro",      prefix: "111100000780300", label: "REG:" },
    ],
    footer: `${STX}Q0001E`,
  },

  AMP_CX: {
    layout: "AMP_CX",
    header: [`${STX}f250`, `${STX}L`, `${STX}e`],
    config: [`${STX}PB`, `${STX}D11`, `${STX}H14`],
    fields: [
      { key: "cliente",       prefix: "191100100820024" },
      { key: "req",           prefix: "191100100820205", label: "REQ:" },
      { key: "profissional",  prefix: "191100100730024", label: "DR(A)" },
      { key: "crm",           prefix: "191100100730205" },
      { key: "produto",       prefix: "191100100640024" },
      { key: "ph",            prefix: "191100100550024", label: "pH:" },
      { key: "lote",          prefix: "191100100550063", label: "L:" },
      { key: "fabricacao",    prefix: "191100100550112", label: "F:" },
      { key: "validade",      prefix: "191100100550156", label: "V:" },
      { key: "uso",           prefix: "191100100460024" },
      { key: "aplicacao",     prefix: "191100100460156", label: "APLICAÇAO:" },
      { key: "conteudo",      prefix: "191100100370024", label: "CONTEM:" },
      { key: "registro",      prefix: "191100100370161", label: "REG:" },
    ],
    footer: `${STX}Q0001E`,
  },

  AMP10: {
    layout: "AMP10",
    header: [`${STX}f250`, `${STX}L`, `${STX}e`],
    config: [`${STX}PB`, `${STX}D11`, `${STX}H14`],
    fields: [
      { key: "cliente",       prefix: "191100101100014" },
      { key: "req",           prefix: "191100101100196", label: "REQ:" },
      { key: "profissional",  prefix: "191100101010014", label: "DR(A)" },
      { key: "crm",           prefix: "191100101010196" },
      { key: "produto",       prefix: "191100100920014" },
      { key: "ph",            prefix: "191100100830014", label: "pH:" },
      { key: "lote",          prefix: "191100100830053", label: "L:" },
      { key: "fabricacao",    prefix: "191100100830102", label: "F:" },
      { key: "validade",      prefix: "191100100830147", label: "V:" },
      { key: "uso",           prefix: "191100100740014" },
      { key: "aplicacao",     prefix: "191100100740147", label: "APLICAÇAO:" },
      { key: "conteudo",      prefix: "191100100650014", label: "CONTEM:" },
      { key: "registro",      prefix: "191100100650151", label: "REG:" },
    ],
    footer: `${STX}Q0001E`,
  },

  TIRZ: {
    layout: "TIRZ",
    header: [`${STX}f250`, `${STX}L`, `${STX}e`],
    config: [`${STX}PB`, `${STX}D11`, `${STX}H14`],
    fields: [
      { key: "cliente",       prefix: "191100100820024" },
      { key: "req",           prefix: "191100100820205", label: "REQ:" },
      { key: "profissional",  prefix: "191100100730024", label: "DR(A)" },
      { key: "crm",           prefix: "191100100730205" },
      { key: "produto",       prefix: "191100100640024" },
      { key: "ph",            prefix: "191100100550024", label: "pH:" },
      { key: "lote",          prefix: "191100100550063", label: "L:" },
      { key: "fabricacao",    prefix: "191100100550112", label: "F:" },
      { key: "validade",      prefix: "191100100550156", label: "V:" },
      { key: "uso",           prefix: "191100100460024" },
      { key: "aplicacao",     prefix: "191100100460156", label: "APLICAÇAO:" },
      { key: "conteudo",      prefix: "191100100370024", label: "CONTEM:" },
      { key: "registro",      prefix: "191100100370161", label: "REG:" },
    ],
    footer: `${STX}Q0001E`,
  },
};

// ─── Extração de valores do RotuloItem ────────────────────

/** Monta o mapa de campos a partir de um RotuloItem */
function extractFields(rotulo: RotuloItem): Record<string, string> {
  const crm = [
    rotulo.prefixoCRM || "",
    rotulo.numeroCRM || "",
    rotulo.ufCRM ? `-${rotulo.ufCRM}` : "",
  ].join("").trim();

  return {
    cliente:      (rotulo.nomePaciente || "").toUpperCase(),
    req:          `${rotulo.nrRequisicao || ""}-${rotulo.nrItem || "0"}`,
    profissional: (rotulo.nomeMedico || "").toUpperCase(),
    crm:          crm.toUpperCase(),
    produto:      (rotulo.composicao || rotulo.formula || "").toUpperCase(),
    ph:           rotulo.ph || "",
    lote:         rotulo.lote || "",
    fabricacao:   rotulo.dataFabricacao || "",
    validade:     rotulo.dataValidade || "",
    uso:          (rotulo.tipoUso || "").toUpperCase(),
    aplicacao:    (rotulo.aplicacao || "").toUpperCase(),
    conteudo:     (rotulo.contem || "").toUpperCase(),
    registro:     rotulo.numeroRegistro || "",
  };
}

// ─── Geração do PPLA ─────────────────────────────────────

/**
 * Gera o PPLA completo para um rótulo, usando o template literal do layout.
 * Retorna a string final exatamente no formato PPLA original.
 *
 * @param layout  Tipo do layout (A_PAC_PEQ, A_PAC_GRAN, AMP_CX, AMP10, TIRZ)
 * @param rotulo  Dados do rótulo
 * @returns       String PPLA pronta para envio à impressora
 */
export function gerarPPLA(layout: LayoutType, rotulo: RotuloItem): string {
  const template = PPLA_TEMPLATES[layout];
  if (!template) {
    throw new Error(`[PPLA] Template não encontrado para layout: ${layout}`);
  }

  const values = extractFields(rotulo);
  const lines: string[] = [];

  // Cabeçalho — literal
  for (const h of template.header) {
    lines.push(h);
  }

  // Configuração — literal
  for (const c of template.config) {
    lines.push(c);
  }

  // Campos — prefixo fixo + label opcional + valor interpolado
  for (const field of template.fields) {
    const value = values[field.key] || "";
    const labelPart = field.label || "";
    lines.push(`${STX}${field.prefix}${labelPart}${value}`);
  }

  // Footer — literal
  lines.push(template.footer);

  // Juntar com \r (CR) — padrão PPLA
  return lines.join("\r");
}

/**
 * Gera PPLA para múltiplos rótulos (um bloco por rótulo).
 */
export function gerarPPLABatch(layout: LayoutType, rotulos: RotuloItem[]): string {
  return rotulos.map(r => gerarPPLA(layout, r)).join("\r");
}

/** Retorna o template bruto para inspeção/debug */
export function getTemplate(layout: LayoutType): PPLATemplate | undefined {
  return PPLA_TEMPLATES[layout];
}

/** Lista todos os layouts disponíveis */
export function getAvailableLayouts(): LayoutType[] {
  return Object.keys(PPLA_TEMPLATES) as LayoutType[];
}
