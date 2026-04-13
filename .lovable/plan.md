

# Fix: Texto salvo não restaura nos outros PCs (AMP10)

## Causa raiz

O texto está sendo salvo corretamente no Supabase (confirmei nos dados — req 10106, 9859, etc. estão todos lá). O problema é que ao restaurar, existe uma validação de largura de coluna (linha 196-197 de `Index.tsx`) que descarta o texto salvo:

```typescript
const maxLineLen = Math.max(...row.texto_livre.split('\n').map(...));
if (Math.abs(maxLineLen - currentCols) <= 5) { // ← rejeita se diferença > 5
```

Para AMP10, `colunasMax = 65`, mas as linhas reais do editor raramente chegam a 65 caracteres (tipicamente 40-55). A diferença ultrapassa 5, e o texto é descartado silenciosamente. O outro PC busca a requisição, o texto salvo é encontrado no banco, mas falha nessa validação e nunca chega ao editor.

## Correção

### `src/pages/Index.tsx` — Pular validação de largura para AMP10

No bloco de restauração (linhas 191-204), para o layout AMP10, adicionar o texto salvo ao `savedMap` diretamente, sem passar pela checagem de `maxLineLen`:

```typescript
savedRows.forEach(row => {
  const rotulo = rotuloById.get(row.item_id);
  if (!rotulo) return;

  // AMP10: confiança total no texto salvo (WYSIWYG)
  if (layoutType === 'AMP10') {
    savedMap[row.item_id] = row.texto_livre;
    return;
  }

  // Outros layouts: manter validação de largura
  if (layoutType === 'A_PAC_PEQ' || layoutType === 'A_PAC_GRAN') return;
  const maxLineLen = Math.max(...row.texto_livre.split('\n').map(...));
  if (Math.abs(maxLineLen - currentCols) <= 5) {
    savedMap[row.item_id] = row.texto_livre;
  }
});
```

### O que NÃO será alterado
- Nenhum layout, coordenada ou fonte
- A lógica de salvamento (upsert) permanece igual
- Validação para A_PAC_PEQ e A_PAC_GRAN continua descartando (por design)

### Resultado esperado
Ao buscar a mesma requisição no PC do Daniel ou da Edi, o texto editado e salvo em outro PC será restaurado corretamente.

