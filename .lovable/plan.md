
Problema identificado:

O defeito agora não é mais “campo sumindo”. Pelo seu print, o `REQ` e o `REG` já estão voltando, mas o conselho (`CREFITO...`) está sendo reimpresso em cima do nome do prescritor. Ou seja: hoje o agente está tentando “quebrar e remontar” a Linha 2 do `A_PAC_GRAN`, e essa remontagem física está errada.

Diagnóstico técnico objetivo:

1. O frontend do `A_PAC_GRAN` gera 2 linhas WYSIWYG em `src/components/LabelTextEditor.tsx`
- Linha 1: `PACIENTE + REQ`
- Linha 2: `DR(A)+MEDICO + CONSELHO + REG`

2. No agente, em `agente_impressao.py`, o `textoLivre` do `A_PAC_GRAN` não está sendo impresso de forma realmente WYSIWYG
- Ele faz parsing da linha
- separa `DR(A)`, conselho e `REG`
- e desenha cada pedaço em coordenadas fixas (`x_med`, `x_crm`, `x_reg`)

3. Esse parsing destrói o espaçamento real vindo do editor
- então o nome do médico é impresso numa coordenada
- o conselho é impresso noutra coordenada fixa
- e os dois acabam colidindo fisicamente

4. O próprio print confirma isso
- `REQ` aparece
- `REG` aparece
- `CREFITO` aparece parcialmente
- mas está literalmente por cima do nome
- então o problema principal agora é “dupla composição da mesma linha”, não falta de área

Solução correta que vou aplicar:

1. Parar de reconstruir a Linha 2 no agente para `A_PAC_GRAN`
- No fluxo `textoLivre` de `gerar_ppla_a_pac_gran`, o agente deve respeitar a visualização do editor
- Em vez de extrair `crm_part` e `reg_part` e redesenhar tudo em posições separadas, ele deve imprimir a linha completa com o espaçamento exato que veio do frontend

2. Manter apenas a separação especial da Linha 1, se necessário
- A Linha 1 pode continuar com tratamento especial para proteger o `REQ`
- Mas a Linha 2 precisa virar 1 linha única WYSIWYG, sem decomposição em blocos independentes

3. Ajustar o frontend para gerar uma Linha 2 fisicamente segura
- Em `generateTextPacGran`, vou manter a largura de 73 colunas
- mas vou reservar uma zona fixa mínima para `conselho + REG`
- e limitar o nome do prescritor exatamente ao espaço restante
- assim a linha já nasce pronta, sem risco de sobreposição

4. Blindar contra textos antigos/sujos
- Atualizar `shouldRegeneratePacGranText` para invalidar textos do `A_PAC_GRAN` que tenham formatação antiga ou zona direita fora do padrão
- Isso força regeneração limpa ao pesquisar novamente

5. Validar coerência entre layout e agente
- `src/config/layouts.ts` ainda está com `linhasMax: 5`, enquanto o gerador do `A_PAC_GRAN` trabalha como layout compacto de 2 linhas e o resolvedor aceita 5 ou 8
- vou alinhar essa configuração para evitar comportamento legado e regressões de normalização

Resultado esperado:
- nada mais escrito em cima de outras informações
- `REQ` visível
- `CREFITO` visível
- `REG` visível
- nome do prescritor ocupando todo o espaço disponível, mas sem invadir o bloco da direita
- impressão igual ao texto exibido no editor

Arquivos a ajustar:
- `agente_impressao.py`
- `src/components/LabelTextEditor.tsx`
- `src/config/layouts.ts`

Detalhe técnico importante:
A correção certa agora não é “mexer mais nas âncoras X do conselho”. Isso só troca o lugar da colisão. O erro de fundo é que o agente do `A_PAC_GRAN` está remontando uma linha que já deveria ser tratada como pronta. A solução segura é: o frontend calcula os limites, e o agente imprime a linha consolidada sem reinterpretar.
