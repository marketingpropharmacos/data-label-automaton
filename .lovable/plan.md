

## Correções: Quantidade de Impressão, Dimensões no Frontend e Agente

### Problema 1: Quantidade de cópias
A lógica de quantidade no frontend (Index.tsx) ja esta correta -- ela duplica os rotulos no array antes de enviar ao agente. O agente tambem ja itera sobre cada rotulo recebido e imprime um label por item. Portanto, se voce seleciona "2", o frontend envia 2 copias do mesmo rotulo e o agente imprime 2 etiquetas. Isso ja funciona corretamente no codigo.

Porem, preciso verificar se o componente LabelCard esta passando corretamente o callback de quantidade. Vou garantir que o fluxo completo esteja funcionando.

### Problema 2: Impressao parou de sair
O agente_impressao.py no repositorio esta identico ao que foi fornecido para copiar. Se parou de imprimir, pode ser que:
- O agente nao foi reiniciado apos a ultima alteracao
- O arquivo local nao foi substituido pelo novo

Nao ha mudanca de codigo necessaria aqui -- o agente precisa ser re-copiado e reiniciado no PC Campos2.

### Problema 3: Dimensoes dos rotulos no frontend nao atualizadas
As dimensoes no `src/config/layouts.ts` estao incorretas para a visualizacao:

| Layout | Atual (mm) | Correto (pol -> mm) |
|--------|-----------|-------------------|
| AMP_CX | 60 x 10 | 109 x 25 (4.3" x 1") |
| AMP10 | 54 x 12 | 89 x 38 (3.5" x 1.5") |
| A_PAC_PEQ | 50 x 20 | 35 x 25 (1.39" x 1") |
| A_PAC_GRAN | 100 x 25 | 35 x 25 (1.39" x 1") |
| TIRZ | 76 x 35 | 109 x 25 (4.3" x 1") |

### Alteracoes planejadas

**Arquivo: `src/config/layouts.ts`**
- Corrigir `dimensoes` de todos os 5 layouts para os valores reais em milimetros baseados nas configuracoes do Formula Certa

**Arquivo: `agente_impressao.py`**
- Nenhuma alteracao de logica necessaria -- o codigo ja esta correto com os comandos `q` e `Q`
- Sera fornecida novamente a versao completa para garantir que o usuario copie o arquivo correto

### Detalhes tecnicos

As dimensoes em milimetros sao convertidas a partir das polegadas do Formula Certa:
- 4.3" = 109.22mm, 3.5" = 88.9mm, 1.39" = 35.31mm
- 1" = 25.4mm, 1.5" = 38.1mm

O `LabelCard.tsx` ja usa `layoutConfig.dimensoes` para renderizar o preview, entao basta corrigir os valores em `layouts.ts`.

