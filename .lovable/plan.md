

# Diagnóstico — Nome da mescla aparecendo abaixo dos ativos

## Causa raiz
Nos layouts **AMP_CX** (`generateTextAmpCaixa`, linha 622) e **AMP10** (`generateTextAmp10`, linha 374), quando o item é uma **mescla** o código:
1. Imprime os ativos (composição). ✓
2. Imprime também a `formula` se for diferente da composição.

O problema do passo 2: em mesclas, `rotulo.formula` é o **nome reduzido da mescla** que vem da tabela `FC03000.DESCRPRD` — ex.:
- Req `10436-7` → `M. DIM. QUEDA E PREV. FIOS`
- Req `10436-8` → `ALOPECIA MASCULINA/FEMININ`
- Req `10474-0` → `LAC CORPORAL (SUG 3) 10ML`

Esse nome reduzido **não deve sair no rótulo** — é só a "etiqueta interna" da mescla no FC. O usuário quer ver apenas os ativos (composição).

A correção anterior (deduplicação) resolveu o caso do **produto único** (DUTASTERIDA), mas não tocou nesse caso porque os textos são genuinamente diferentes.

## Como diferenciar "mescla" de "produto único"
Já existe a função `isValidComposicao(composicao)` no arquivo, que retorna `true` quando a composição tem múltiplos ativos / formato de mescla. Hoje ela é usada só para escolher entre o ramo `mescla` e o ramo `produto único`.

A regra correta passa a ser:
- **Mescla** (`isValidComposicao === true`) → imprime **só a composição**, **nunca** a formula.
- **Produto único** (`isValidComposicao === false`) → imprime a formula (comportamento atual já preservado pelo `else`).

A deduplicação `composicao vs formula` deixa de ser necessária — o ramo "mescla" simplesmente não imprime mais a formula.

## Correção proposta

### Em `generateTextAmpCaixa` (AMP_CX, linhas 611–622)
Remover o bloco que imprime `formulaRaw` dentro do ramo `if (mescla)`. Resultado: mesclas mostram só os ativos (composição quebrada em linhas).

### Em `generateTextAmp10` (AMP10, linhas 363–374)
Mesma remoção dentro do `if (mescla)`.

Pseudocódigo final do ramo mescla:
```ts
if (mescla) {
  const compText = (rotulo.composicao || "").toUpperCase();
  wrapText(compText, CW, 3).split('\n').forEach(l => lines.push(indentLine(l)));
  // Não imprime mais o nome reduzido da mescla
}
```

## O que NÃO muda
- **Produto único** (DUTASTERIDA, etc.) — continua imprimindo a formula no ramo `else`. Sem regressão.
- **Kits** — ramo separado (`if (isKit)`), intocado.
- **Backend (`servidor.py`)** — continua devolvendo `composicao` e `formula`. Aditividade preservada.
- **Layouts A_PAC_PEQ, A_PAC_GRAN, TIRZ** — não usam essa lógica composicao/formula. Não regridem.
- **Textos salvos no Supabase** — intocados.

## Validação
1. Req `10436-7` (mescla PROHAIRIN/CAPIXYL/D-PANTENOL/COPPER) → some o `M. DIM. QUEDA E PREV. FIOS`. Restam só os ativos.
2. Req `10436-8` (mescla D PANTENOL/BIOTINA/IGF/BFGF/COPPER/KGF) → some o `ALOPECIA MASCULINA/FEMININ`.
3. Req `10474-0` (mescla ELASTINA/ÁCIDO ALFA LIPOICO/etc.) → some o `LAC CORPORAL (SUG 3) 10ML`.
4. Req `10436-4` (DUTASTERIDA — produto único) → continua mostrando uma linha só (DUTASTERIDA 0,1%).
5. Mesma checagem no layout AMP10.

