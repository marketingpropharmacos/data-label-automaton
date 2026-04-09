
Motivo do corte no front-end hoje:

1. O editor mostra primeiro o `textoLivre` salvo, não o texto recém-gerado  
   Em `src/components/LabelTextEditor.tsx`:
   ```ts
   const text = rotulo?.textoLivre ?? generateText(...)
   ```
   Então, se já existe um `textoLivre` antigo para esse rótulo, o preview usa esse texto antigo.

2. A regra nova de abreviação está correta, mas só entra quando o texto é regenerado  
   No `A_PAC_PEQ`, a geração atual já chama:
   ```ts
   abbreviateNameStrict(rotulo.nomeMedico.toUpperCase(), medicoMax)
   ```
   Ou seja: a lógica “primeiro nome + último sobrenome” já existe no gerador.

3. O problema é que o texto salvo antigo ainda passa na validação  
   Em `src/pages/Index.tsx`, a invalidação do `saved_rotulos` para linha `DR(A)` só descarta quando:
   - não há conselho visível, e
   - a linha parece truncada pelo comprimento

   Mas no seu caso a linha antiga continua com conselho, por exemplo:
   ```text
   DR(A)KAROLINY ADRIANA VIEI COREN-SC-59418
   ```
   Então ela ainda é considerada “válida”, mesmo estando errada visualmente.

4. Por isso o sobrenome continua cortado no preview  
   O frontend não está “gerando errado” agora.  
   Ele está reaproveitando um `textoLivre` antigo já truncado, e por isso você continua vendo:
   - `VIEI`
   em vez de
   - `VIEIRA`

O que precisa ser ajustado:

### 1. Fortalecer a invalidação do `textoLivre` antigo no `A_PAC_PEQ`
Em `src/pages/Index.tsx`, a validação da linha 2 precisa comparar o texto salvo com a regra esperada do layout pequeno:
- detectar quando existe `DR(A)` + conselho
- extrair o nome salvo
- se o nome salvo não bater com o padrão abreviado esperado para “primeiro + último”, descartar o `textoLivre`
- isso forçará a regeneração com a lógica nova

### 2. Normalizar automaticamente a linha 2 ao abrir o rótulo
Em `src/components/LabelTextEditor.tsx`, além de gerar corretamente, o ideal é:
- quando layout for `A_PAC_PEQ`
- e existir `textoLivre`
- reescrever a linha `DR(A)` com a regra obrigatória antes de mostrar no textarea

Assim o preview deixa de depender de texto salvo quebrado.

### 3. Manter o agente como proteção final
O agente já foi pensado para reforçar a regra, mas o problema que você está vendo agora é principalmente de preview/estado salvo no frontend.
Então o conserto principal está em:
- `src/pages/Index.tsx`
- `src/components/LabelTextEditor.tsx`

Resultado esperado após esse ajuste:
- no front-end, a linha do médico não aparecerá mais com o último sobrenome cortado
- texto salvo antigo será descartado ou corrigido automaticamente
- o preview vai refletir a regra combinada: primeiro nome inteiro + último sobrenome inteiro

Detalhe técnico importante:
Hoje o sistema invalida muito bem a linha do paciente antes da `REQ`, mas ainda está permissivo demais para a linha do médico. Esse é o motivo real de você ainda enxergar o sobrenome cortado no front-end, mesmo depois das conversas anteriores.
