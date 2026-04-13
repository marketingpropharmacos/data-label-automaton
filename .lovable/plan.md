

# Corrigir erro "Erro na impressão" no AMP10

## Problema identificado

O erro `sequence item 2: expected str instance, int found` ocorre em **`agente_impressao.py`** nas funções:

1. **`_crm_completo()`** (linha 303): `'-'.join(parts)` — `numeroCRM` chega como `int` (ex: `59418`) e o `join` exige strings.
2. **`_format_conselho_dots()`** (linha 606-608): mesmo problema — usa `f"{prefixo}.{uf}-{numero}"` que funciona, mas o fallback na linha 608 com `'-'.join(parts)` também quebra.

O frontend (`printAgentService.ts`) envia `numeroCRM` tal como vem do dado original (número), sem converter para string.

## Plano (sem mexer em layout nenhum)

### 1. Corrigir `agente_impressao.py` — forçar `str()` nos helpers de CRM

Em `_crm_completo()` e `_format_conselho_dots()`, converter `prefixo`, `numero` e `uf` para `str(...)` antes de usar:

```python
prefixo = str(rotulo.get('prefixoCRM', '') or '').strip()
numero = str(rotulo.get('numeroCRM', '') or '').strip()
uf = str(rotulo.get('ufCRM', '') or '').strip()
```

### 2. Reforçar o frontend — converter `numeroCRM` para string no payload

Em `src/services/printAgentService.ts`, na função `imprimirViaAgente`, garantir:

```typescript
numeroCRM: String(r.numeroCRM || ''),
prefixoCRM: String(r.prefixoCRM || ''),
ufCRM: String(r.ufCRM || ''),
```

### O que NÃO será alterado

- Nenhum layout (AMP10, AMP_CX, etc.)
- Nenhuma coordenada, fonte ou espaçamento
- Nenhuma lógica de formatação de texto

### Resultado esperado

O comando imprimir volta a funcionar sem o erro "Nenhum comando gerado", mantendo exatamente o comportamento atual de layout.

