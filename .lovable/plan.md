

# Diagnóstico — "005% - MANTER EM GELADEIRA" no lugar de "LATANOPROSTA" (Req 010236-4)

## O que está acontecendo

O texto salvo no Supabase para o item `10236-4` (layout AMP_CX) tem literalmente isso na linha da composição:

```
005% - MANTER EM GELADEIRA
```

Não há "LATANOPROSTA" em lugar nenhum do texto. Comparei com os outros itens da mesma requisição — todos saíram corretos (DUTASTERIDA 0,1%, MINOXIDIL 0,5%, FINASTERIDE 0,05%, etc.). Só o `-4` veio errado.

## Causa raiz

O backend (`servidor.py`) monta o campo `composicao` em duas etapas:

1. **FC99999** (ativos da fórmula) → preenche `composicao` com os ativos reais (ex: "LATANOPROSTA 0,05%").
2. **FC03300 / OBSFIC** (observações do item) → adiciona texto extra na composição via `composicao = composicao + " | " + obs_texto` (linha 4477 de `servidor.py`).

No item `10236-4` aconteceu o caso patológico:

- **FC99999 não retornou nada** para esse item (ou retornou só algo descartado pelo filtro `is_ativo_mescla`/`is_repeticao_produto`) → `composicao` ficou **vazia**.
- **FC03300 tinha duas observações cadastradas** no FC para esse item: `"0,05%"` e `"MANTER EM GELADEIRA"`.
- Como `composicao` estava vazia, o código entra no `else` da linha 4478: `composicao = obs_texto` → vira literalmente `"0,05% | MANTER EM GELADEIRA"`.
- Pior: o item foi marcado como `e_mescla = True` (linha 4480) — mas não é mescla nenhuma, é produto único com observações.
- A `formula` (nome do produto) **se perdeu** porque o frontend, no ramo `if (mescla)`, imprime só `composicao` e ignora `formula`.

Resultado no rótulo: a observação "0,05% - MANTER EM GELADEIRA" tomou o lugar do nome do ativo. O nome real do produto (`LATANOPROSTA`) ficou só no `formula` / `descricaoProduto`, mas não foi impresso porque o item foi tratado como mescla.

## Por que só o `-4` deu problema

Os outros itens da req tinham **ativos válidos no FC99999** ou **sem observações no FC03300** — então a composição ficou correta ou ficou vazia (caindo no ramo "produto único" e imprimindo a `formula` corretamente).

O `-4` é o único onde:
- FC99999 não devolveu o ativo principal.
- FC03300 tinha observações de manuseio (que **não são ativos**).
- O merge mecânico transformou observação em "composição falsa" e marcou como mescla.

## Correção proposta

Duas camadas de defesa, **estritamente aditivas** (preservam o que já funciona):

### 1. Backend (`servidor.py`, função que monta o rótulo final por item — bloco linhas ~4469–4492)

Antes de aceitar `obs_texto` do FC03300 como "ativo", validar se realmente parece ativo. Critério: a observação só vira parte da `composicao` se **pelo menos uma** das partes tiver sinal de ativo (dose `MG`/`ML`/`%`/`UI`/`MCG` **acompanhada de um nome com mais de 3 letras**). Casos como `"0,05%"` puro, `"MANTER EM GELADEIRA"`, `"AGITAR ANTES DE USAR"`, `"USO TÓPICO"` são reconhecidos como **observações de manuseio** e:
- **Não entram** em `composicao`.
- **Não marcam** o item como `e_mescla`.

Adicionar uma função auxiliar `is_observacao_manuseio(texto)` com lista de gatilhos conhecidos: `MANTER`, `GELADEIRA`, `REFRIGERAR`, `AGITAR`, `USO TÓPICO`, `USO ORAL`, `CONSERVAR`, `ABRIGO DA LUZ`, `AO ABRIGO`, `TEMPERATURA`, `VIA ORAL`, `BANHO MARIA`, etc. Se a observação cair nessa lista (ou for só um percentual/dose isolado sem nome), descarta.

Resultado para o `10236-4`: `composicao` fica vazia → cai no ramo "produto único" → imprime `formula` = `LATANOPROSTA 0,05%` (ou o nome correto vindo do FC).

### 2. Frontend (`src/components/LabelTextEditor.tsx`, funções `generateTextAmp10` e `generateTextAmpCaixa` — ramo `if (mescla)`)

Cinto e suspensório: se a `composicao` (após o `removeNomeReduzidoDaComposicao`) **não contiver nenhum sinal de dose** (`MG|ML|G|%|UI|MCG`), tratar como **falsa mescla** e cair no ramo "produto único" (imprimir `formula`). Isso protege contra qualquer dado legado já salvo no Supabase ou novos casos patológicos que escapem do backend.

### 3. Limpeza do registro já salvo

O texto de `10236-4` no Supabase está com o conteúdo errado (a fix nova só vale para gerações futuras). Após o fix:
- Apagar a linha `saved_rotulos` onde `nr_requisicao='10236' AND item_id LIKE '10236-4-%'` (todos os layouts).
- Próxima abertura da req regenera o rótulo corretamente.

## O que NÃO muda

- Mesclas reais (req `10436-7`, `10436-8`, `10474-0` etc.) — continuam mostrando todos os ativos. A nova checagem só descarta observações de manuseio sem dose.
- Produtos únicos normais (DUTASTERIDA, MINOXIDIL, etc.) — caminho idêntico ao atual.
- Kits — ramo separado, intocado.
- Layouts A_PAC_PEQ, A_PAC_GRAN, TIRZ — não usam essa lógica composicao/formula.
- `servidor.py` — alteração estritamente aditiva (nova função + 2 linhas de filtro), sem remover comportamento existente.
- Outros textos já salvos no Supabase — preservados (política de "confiança total" mantida).

## Validação

1. Req `010236-4` → após apagar o `saved_rotulos` antigo, deve reaparecer com `LATANOPROSTA 0,05%` (ou nome real do FC), sem o "MANTER EM GELADEIRA".
2. Req `010236-2` (DUTASTERIDA) → continua com `DUTASTERIDA 0,1%`.
3. Req `10436-7` (mescla real PROHAIRIN/CAPIXYL/D-PANTENOL) → continua mostrando todos os ativos.
4. Req `010236-7` (mescla VIT A/D/E/K2 com doses em UI/MCG) → continua mostrando todas as vitaminas.
5. Verificar logs do backend: o `-4` deve mostrar `[FC03300] descartado: observação de manuseio "MANTER EM GELADEIRA"`.
6. Mesma checagem nos layouts AMP10 e AMP_CX.

