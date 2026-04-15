

# Filtrar posologia: mostrar apenas quando for tipo de uso válido

## Problema
Ao trocar de `posologia` para `tipoUso`, o rótulo agora mostra "USO NASAL" (valor do campo `tipoUso` no banco), mas o correto para esse item é "USO EM CONSULTORIO" que vinha da `posologia`. A posologia pode conter tanto tipos de uso válidos quanto instruções de tratamento que devem ser ocultadas.

## Solução
Usar a `posologia` como fonte, mas **filtrar**: mostrar apenas se o texto corresponder a um tipo de uso conhecido. Caso contrário, ignorar.

## Alteração técnica

**Arquivo**: `src/components/LabelTextEditor.tsx`

1. Criar uma lista de tipos de uso válidos (mesmos do backend `servidor.py`):
```typescript
const TIPOS_USO_VALIDOS = [
  'USO INTERNO', 'USO EXTERNO', 'USO EM CONSULTORIO',
  'USO VETERINARIO', 'USO TOPICO', 'USO OFTALMICO',
  'USO NASAL', 'USO ORAL'
];
```

2. Criar função helper:
```typescript
function extrairTipoUso(posologia: string, tipoUso: string): string {
  const pos = posologia?.toUpperCase().trim() || "";
  if (TIPOS_USO_VALIDOS.includes(pos)) return pos;
  return tipoUso?.toUpperCase() || "";
}
```

3. Nos 4 layouts (AMP_CX ~linha 379, AMP10 ~linha 618, TIRZ ~linha 702, genérico), substituir:
```typescript
// De:
const usoText = rotulo.tipoUso?.toUpperCase() || "";
// Para:
const usoText = extrairTipoUso(rotulo.posologia, rotulo.tipoUso);
```

## Resultado
- Posologia = "USO EM CONSULTORIO" → aparece ✓
- Posologia = "USO SOMENTE TRATAMENTO ALOPECIA" → ignorada, cai no fallback `tipoUso` ✓
- Posologia vazia → usa `tipoUso` ✓

