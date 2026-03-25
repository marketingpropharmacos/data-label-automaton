

## Plano: Completar layout AMP_CX — diferenciar Kit vs Mescla com todos os campos

### Problema atual

1. **Kit**: falta `PH:X` na linha de cada componente (só mostra L/F/V)
2. **Uso + Aplicação**: condicional na linha 224/283 — se ambos vazios, a linha some (deveria sempre aparecer para edição manual)
3. **Mescla/Item único**: a composição quebra em até 3 linhas, empurrando campos para fora do `maxLines=8`
4. `linhasMax` do AMP_CX é 8, pode cortar as linhas finais

### Layout esperado

**Kit:**
```text
PACIENTE                         REQ:008009-1
DR(A)NOME                        CRM.SP-282242
CLORETO MG PH:5.5 L:240601 F:06/24 V:12/24
ACIDO TRANEXAMICO PH:6.0 L:240602 F:06/24 V:12/24
USO TOPICO                       APLICAÇÃO:ID/SC
CONTEM: 5 FR                     REG:54321
```

**Mescla/Item único:**
```text
PACIENTE                         REQ:009134-0
DR(A)NOME                        CRM-SP-282242
VITAMINA D 600.000UI/ML
pH:5,0  L:738/26  F:02/26  V:12/26
USO EM CONSULTORIO               APLICAÇÃO:IM
CONTEM: 1FR. DE 1ML              REG:21847
```

### Alterações

**`src/config/layouts.ts`** (1 linha)
- Linha 68: `linhasMax: 8` → `linhasMax: 10`

**`src/components/LabelTextEditor.tsx`** — função `generateTextAmpCx`:

1. **Kit** (linhas 206-218): Adicionar `PH:X` no array `meta` antes de L/F/V — usar `comp.ph` (já existe no tipo `ComponenteKit`)
2. **Kit + Non-kit** (linhas 224 e 283): Remover o `if` condicional — sempre exibir a linha `USO + APLICAÇÃO`, mesmo que vazia
3. **Non-kit** (linhas 250-258): Limitar composição a **1 linha** (não 3) para não empurrar campos fora

### Arquivos alterados
- `src/config/layouts.ts` — 1 linha
- `src/components/LabelTextEditor.tsx` — ~10 linhas

