

# Adicionar ".GR" ao conselho CNE nos rótulos

## O que muda
O conselho de enfermagem (código `4`) passará de `CNE` para `CNE.GR`, resultando em formatações como `CNE.GR-RJ-69786` em vez de `CNE-RJ-69786`.

## Alteração técnica

**Arquivo**: `src/components/LabelTextEditor.tsx`

1. **Linha 244** — Alterar o mapeamento do código `'4'`:
```typescript
// De:
'4': { conselho: 'CNE' },
// Para:
'4': { conselho: 'CNE.GR' },
```

2. **Linha 307** (`formatConselhoFC`) — Evitar duplo ponto quando o conselho já contém `.`:
```typescript
// De:
return `${tipo.conselho}.${ufCRM}-${numeroCRM}`;
// Para:
const sep = tipo.conselho.includes('.') ? '-' : '.';
return `${tipo.conselho}${sep}${ufCRM}-${numeroCRM}`;
```

Isso garante:
- CRM → `CRM.SP-12345` (sem mudança)
- CNE.GR → `CNE.GR-RJ-69786` ✓

Os outros pontos que formatam conselho inline (A_PAC_PEQ linha 267, A_PAC_GRAN linha 430, genérico linha 793) já usam o padrão `${conselhoNome}-UF-NUMERO`, que com `CNE.GR` produz `CNE.GR-RJ-69786` automaticamente.

**Arquivo**: `src/config/pplaTemplates.ts` — O `extractFields` monta o CRM de forma diferente (concatenação bruta), mas não usa o mapeamento de `tiposPrescritores`, então não precisa de alteração.

## Resultado
Todos os layouts mostrarão `CNE.GR-RJ-69786` em vez de `CNE-RJ-69786` para prescrições do tipo enfermagem.

