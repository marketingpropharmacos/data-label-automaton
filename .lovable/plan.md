
# Plano: Corrigir Ordenação dos Itens de Requisição (REQ: X-0, X-1, X-2...)

## Problema Identificado

O frontend está sobrescrevendo o número do item (`nrItem`) que vem do backend com um índice sequencial simples, ignorando a ordem original da prescrição.

**Arquivo problemático**: `src/services/requisicaoService.ts` (linhas 68-74)

```typescript
// CÓDIGO ATUAL (ERRADO)
const rotulos = formulas.map((item, index) => {
  const rotulo = mapearRotulo(item);
  rotulo.id = `${rotulo.nrRequisicao}-${index + 1}-${rotulo.lote || index}`;
  rotulo.nrItem = String(index + 1); // ← SOBRESCREVE o nrItem original!
  return rotulo;
});
```

O backend já envia o `nrItem` correto (baseado no `ITEMID` da tabela FC12110 ordenado), mas o frontend ignora e substitui.

---

## Solução

### Alteração no arquivo `src/services/requisicaoService.ts`

Preservar o `nrItem` que vem do backend (baseado no ITEMID original) e apenas gerar um ID único para React:

```typescript
// CÓDIGO CORRIGIDO
const rotulos = formulas.map((item, index) => {
  const rotulo = mapearRotulo(item);
  // ID único para React (combina requisição, nrItem original e lote)
  rotulo.id = `${rotulo.nrRequisicao}-${rotulo.nrItem}-${rotulo.lote || index}`;
  // MANTÉM o nrItem original do backend (não sobrescreve!)
  return rotulo;
});
```

---

## Resultado Esperado

Antes da correção:
- Item 1: Alfa-Lipóico (REQ: 86482-1)
- Item 2: Coenzima (REQ: 86482-2)
- Item 3: Outro (REQ: 86482-3)

Depois da correção (ordem do ITEMID original):
- Item 1: Coenzima (REQ: 86482-1)  ← conforme ITEMID no banco
- Item 2: Alfa-Lipóico (REQ: 86482-2)
- Item 3: Outro (REQ: 86482-3)

---

## Seção Técnica

### Fluxo de Dados Corrigido

```text
FC12110 (Banco)          servidor.py              requisicaoService.ts        LabelCard.tsx
┌──────────────┐         ┌──────────────┐         ┌──────────────────────┐    ┌────────────┐
│ ITEMID = 1   │───────▶ │ nrItem = "1" │───────▶ │ nrItem = "1" (MANTÉM)│──▶ │ REQ:X-1    │
│ ITEMID = 2   │         │ nrItem = "2" │         │ nrItem = "2" (MANTÉM)│    │ REQ:X-2    │
│ ITEMID = 3   │         │ nrItem = "3" │         │ nrItem = "3" (MANTÉM)│    │ REQ:X-3    │
└──────────────┘         └──────────────┘         └──────────────────────┘    └────────────┘
       ↑                        ↑                         ↑
  ORDER BY ITEMID         Usa ITEMID como          NÃO sobrescreve mais
                          nrItem (linha 1462)       (remove linha 72)
```

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/services/requisicaoService.ts` | Remover linha que sobrescreve `nrItem` |

### Verificação Backend

O backend já está correto:
- Linha 1139: `ORDER BY I.ITEMID`
- Linha 1462: `"nrItem": str(item_id)`

Apenas o frontend precisa de correção.
