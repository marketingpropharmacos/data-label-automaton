

# Resolucao de Sinonimos via FC03200

## Problema
Quando uma requisicao contem um produto que e sinonimo de um kit (ex: CDPRO 89404 e sinonimo de 86390), o sistema nao encontra o kit porque so busca pelo CDPRO original. A tabela FC03200 armazena esses relacionamentos (CDPRO = base, CDSIN = sinonimo), mas o backend ignora essa tabela.

## Solucao
Criar uma funcao utilitaria `resolver_sinonimo()` no backend (servidor.py) que, dado um CDPRO, verifica na FC03200 se esse codigo e sinonimo de outro produto. Se for, retorna o CDPRO base; senao, retorna o proprio codigo.

Essa resolucao sera chamada **antes** da deteccao de kit (`montar_kit_expandido` e `detecta_kit`), garantindo que sinonimos sejam tratados como o produto base.

## Fluxo com a mudanca

```text
Requisicao (FC12110)
   |
   v
CDPRO do item (ex: 89404)
   |
   v
resolver_sinonimo(89404)  <-- NOVO
   |
   v
FC03200: CDSIN=89404 -> CDPRO=86390  (encontrou sinonimo!)
   |
   v
Usa 86390 para detecta_kit() e montar_kit_expandido()
   |
   v
Kit encontrado normalmente via FC05000.CDSAC = 86390
```

## Detalhes Tecnicos

### 1. Nova funcao: `resolver_sinonimo(cursor, cdpro)`
- Local: `servidor.py`, junto das funcoes auxiliares (antes de `detecta_kit`)
- Logica:
  - `SELECT CDPRO FROM FC03200 WHERE CDSIN = ?` (busca se o codigo e sinonimo de alguem)
  - Se encontrar, retorna o CDPRO base
  - Se nao encontrar, retorna o proprio cdpro original
  - Inclui fallback para busca numerica (int) caso string nao funcione
  - Logs com prefixo `[SINONIMO]` para rastreamento

### 2. Integracao no loop principal (linha ~3411)
- Antes de chamar `montar_kit_expandido(cursor, cdpro, ...)`, resolver o sinonimo:
  ```
  cdpro_resolvido = resolver_sinonimo(cursor, cdpro)
  kit_expandido = montar_kit_expandido(cursor, cdpro_resolvido, ...)
  ```
- O CDPRO original continua sendo usado para os demais dados (lote, FC99999, etc.)
- Apenas a deteccao de kit usa o cdpro_resolvido

### 3. Novo endpoint de debug (opcional mas recomendado)
- `GET /api/debug/sinonimos/<cdpro>` - retorna todos os sinonimos de um produto (tanto como base quanto como sinonimo)
- Util para validar que a FC03200 esta sendo lida corretamente

### 4. Arquivos modificados
- `servidor.py` - funcao `resolver_sinonimo()`, integracao no loop, endpoint de debug

### 5. Impacto
- Zero impacto na logica existente de kits, mesclas e itens unicos (conforme restricao de estabilidade)
- A funcao e isolada e so adiciona um passo de resolucao antes da deteccao
- Produtos que nao sao sinonimos continuam funcionando identicamente (a funcao retorna o mesmo CDPRO)

