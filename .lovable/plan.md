

## Problema

O layout A_PAC_GRAN está configurado com 57 colunas, mas a etiqueta física comporta 73 colunas. Com 57 colunas, os nomes são truncados desnecessariamente e os campos da direita ficam espremidos. O usuário confirmou que cabem 73 colunas nesse layout.

## Solução

Padronizar A_PAC_GRAN para 73 colunas em todos os pontos do sistema:

### 1. `src/config/layouts.ts` — layout A_PAC_GRAN
- Alterar `colunasMax: 57` → `colunasMax: 73`

### 2. `src/config/templates.ts` — template e LAYOUT_INFO
- Alterar `A_PAC_GRAN: { cols: 57, ... }` → `cols: 73`
- Expandir as linhas do template A_PAC_GRAN para usar as 73 colunas (mais espaço para cada campo)

### 3. `agente_impressao.py` — PRINTER_CONFIGS
- Alterar `'cols_max': 57` → `'cols_max': 73`

### 4. `src/components/LabelTextEditor.tsx` — generateTextPacGran
- O `W` já vem de `layoutConfig.colunasMax`, então com a mudança no layout.ts, automaticamente passa a usar 73
- Comentário no topo será atualizado de "57 cols" para "73 cols"

### 5. Invalidação de cache
- Em `src/pages/Index.tsx`, garantir que o textoLivre salvo com 57 colunas seja descartado e regenerado com 73

## Resultado esperado
- Nomes completos (paciente, médico) sem truncamento
- REQ, Conselho e REG com espaço de sobra
- Mesma largura útil que AMP_CX/TIRZ (73 colunas)

## Arquivos
- `src/config/layouts.ts`
- `src/config/templates.ts`
- `agente_impressao.py`
- `src/components/LabelTextEditor.tsx`
- `src/pages/Index.tsx`

