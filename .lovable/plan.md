

# Auto-Wrap de Texto por Limite de Colunas/Linhas

## Resumo
Implementar limites fisicos de colunas e linhas por layout, com word-wrap automatico para evitar cortes na impressora.

## Limites Confirmados

| Layout     | Colunas | Linhas | Dimensoes  | Status       |
|------------|---------|--------|------------|--------------|
| A_PAC_PEQ  | 27      | 8      | 45x25mm    | Confirmado   |
| A_PAC_GRAN | 57      | 8      | 76x25mm    | Estimado     |
| AMP_CX     | 73      | 8      | 109x25mm   | Confirmado   |
| AMP10      | 65      | 10     | 89x38mm    | Estimado     |
| TIRZ       | 73      | 8      | 109x25mm   | Mesmo AMP_CX |

## Alteracoes

### 1. Tipo LayoutConfig (src/types/requisicao.ts)
- Adicionar `colunasMax?: number` e `linhasMax?: number` ao tipo `LayoutConfig`

### 2. Configuracao de layouts (src/config/layouts.ts)
- Definir `colunasMax` e `linhasMax` em cada um dos 5 layouts conforme tabela acima

### 3. Word-wrap no editor (src/components/LabelTextEditor.tsx)
- Criar funcao `wrapText(text, maxCols, maxLines)`:
  - Quebra cada linha que excede maxCols no ultimo espaco antes do limite
  - Se palavra unica excede o limite, forca quebra no caractere
  - Trunca resultado no maxLines (linhas excedentes sao descartadas)
- Aplicar wrap na geracao inicial do texto (`generateText`)
- Aplicar wrap em tempo real quando usuario edita (`handleTextChange`)
- Barra de status mostra limites reais: `Lin: 1/8 Col: 2/27`

