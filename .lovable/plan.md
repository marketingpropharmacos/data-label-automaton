

## Problema Identificado

O layout A_PAC_PEQ no frontend esta com `colunasMax: 27`, enquanto o agente de impressao usa `cols_max: 38`. O texto e truncado no editor antes de chegar ao agente, causando cortes na impressao.

A imagem de referencia confirma que cabem ~38 caracteres por linha na etiqueta fisica de 45x25mm com a Fonte 0.

## Plano de Correcao

### 1. Atualizar `colunasMax` no layout A_PAC_PEQ (src/config/layouts.ts)

Mudar `colunasMax` de **27** para **38** no layout A_PAC_PEQ para alinhar com o `cols_max` do agente de impressao.

### 2. Atualizar `generateTextPacPeq` (src/components/LabelTextEditor.tsx)

Ajustar a funcao geradora para considerar os 38 caracteres de largura no alinhamento com `padLine`, garantindo que Paciente+REQ e Medico+Conselho usem toda a largura disponivel.

### 3. Manter a estrutura de 7 linhas

A geracao de texto continua com as 7 linhas, mas agora com largura de 38 colunas:
- Linha 1: Paciente + REQ (alinhado a direita) - 38 colunas
- Linha 2: Medico + Conselho - 38 colunas
- Linha 3: Composicao ou Formula
- Linha 4: Lote + Fabricacao + Validade
- Linha 5: Aplicacao + pH
- Linha 6: Posologia
- Linha 7: REG (alinhado a direita)

### Detalhes Tecnicos

**Arquivo: src/config/layouts.ts (linha 111)**
- `colunasMax: 27` alterado para `colunasMax: 38`

**Arquivo: src/components/LabelTextEditor.tsx**
- A funcao `generateTextPacPeq` ja usa `layoutConfig.colunasMax` dinamicamente, entao basta corrigir o valor na config
- Nenhuma alteracao necessaria no `agente_impressao.py` (ja usa `cols_max: 38`)

