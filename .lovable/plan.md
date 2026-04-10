

## Problema

A função `abbreviateNameStrict` (frontend) e `_abbreviate_name` (agente) estão gerando iniciais com **espaços entre cada inicial**: `"ADRIANA A. D. C. OLIVEIRA"`. Esses espaços extras ocupam colunas demais e causam sobreposição física na etiqueta impressa.

O formato correto confirmado pelo usuário na impressão real é: `"ADRIANA A.D.C. OLIVEIRA"` — iniciais juntas, com espaço apenas antes do último sobrenome.

## Ajustes

### 1. `src/components/LabelTextEditor.tsx` — função `abbreviateNameStrict`

Alterar a ordem de tentativa de abreviação:
- **Primeiro**: tentar iniciais compactas COM espaço antes do último nome → `"ADRIANA A.D.C. OLIVEIRA"`
- **Segundo**: se não couber, tentar sem espaço → `"ADRIANA A.D.C.OLIVEIRA"`
- Remover a tentativa com iniciais espaçadas (`A. D. C.`)

Linhas 100-107: trocar a lógica para que o formato compacto `first + ' ' + initials.join('') + ' ' + last` seja a primeira tentativa.

### 2. `agente_impressao.py` — função `_abbreviate_name`

Mesma mudança: linhas 137-145:
- Primeiro tentar: `first + ' ' + ''.join(initials) + ' ' + last`
- Segundo: sem espaço antes do last
- Remover tentativa com iniciais espaçadas

### Resultado esperado

```text
ADRIANA A.D.C. OLIVEIRA   REQ:9750-0
DR(A)ADRIANA A.D.C. OLIVEIRA CRM-RJ-4651
```

Iniciais juntas, espaço só antes do sobrenome final. Sem sobreposição na etiqueta.

