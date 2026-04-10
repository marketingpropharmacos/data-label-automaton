
Diagnóstico:

O problema agora não é falta de espaço nem truncamento. O REQ, o CREFITO e o REG sumiram porque o `A_PAC_GRAN` passou a calcular os campos da direita usando `largura_dots = 608` como se toda essa largura fosse área segura no eixo X.

Só que esse layout imprime com `rot=1`, e o mapa físico real do Fórmula Certa para ele usa uma faixa X muito menor. O próprio template-base mostra isso em `src/config/pplaTemplates.ts`:

- `REQ` em X=240
- `CRM/CREFITO` em X=230
- `REG` em X=300

Ou seja: ao ancorar pela “borda direita total” (`608`), os campos da direita foram empurrados para fora da área imprimível. Por isso, na etiqueta física, só sobra o bloco da esquerda visível.

Solução que vou aplicar:

1. Corrigir `agente_impressao.py` no `gerar_ppla_a_pac_gran`
- Ajustar os 2 fluxos:
  - modo `textoLivre`
  - modo estruturado
- Parar de usar `largura_dots - ...` para posicionar `REQ`, `CREFITO` e `REG` no `A_PAC_GRAN`
- Usar o mapa físico real desse layout como referência de âncoras seguras

2. Voltar o bloco direito para a faixa física correta
- Linha 1:
  - paciente à esquerda
  - `REQ` posicionado na zona segura da direita, compatível com o FC
- Linha 2:
  - `DR(A)+prescritor` à esquerda
  - `CREFITO` e `REG` posicionados na direita dentro da faixa segura
- Em vez de “ancorar no fim absoluto da etiqueta”, vou ancorar no “fim imprimível real” desse layout rotacionado

3. Separar novamente `CREFITO` e `REG` no agente
- Em vez de tratar tudo como um único `right_block`, vou imprimir conselho e registro como comandos separados
- Isso dá controle fino e evita desaparecer tudo de uma vez quando a âncora estiver errada
- Se o conselho vier longo, o ajuste será nele, sem jogar o `REG` para fora da etiqueta

4. Manter o layout em 73 colunas no frontend
- Não vou desfazer a padronização de 73 colunas
- O editor pode continuar usando a largura completa
- O ajuste será apenas na conversão para coordenadas PPLA físicas do `A_PAC_GRAN`

5. Blindagem para não regressar
- Deixar explícito no código que o `A_PAC_GRAN` rotacionado não pode usar `largura_dots` como borda direita direta
- Fixar uma faixa X segura para os campos da direita com base no mapa FC já existente

Resultado esperado:
- `REQ` volta a aparecer
- `CREFITO` volta a aparecer
- `REG` volta a aparecer
- o nome do prescritor continua saindo completo
- o layout continua usando as 73 colunas sem perder os campos da direita

Arquivos:
- `agente_impressao.py` — correção principal
- `src/config/pplaTemplates.ts` — usado como referência das coordenadas físicas corretas; só edito se eu centralizar essas âncoras

Detalhe técnico:
O erro veio de tratar “73 colunas de texto” como “pode usar toda a largura em dots no X”. No `A_PAC_GRAN`, por causa da rotação do PPLA, isso não vale. A correção certa é manter as 73 colunas no texto, mas mapear `REQ/CREFITO/REG` para a faixa física correta do layout.
