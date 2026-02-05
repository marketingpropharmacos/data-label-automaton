
# Plano: Corrigir Extração de Aplicação - Problema de Encoding

## Problema Identificado

O print mostra que a aplicação "APLICAÇÃO: SC" deveria estar sendo capturada, mas não está aparecendo no frontend. Após análise do código, identificamos dois problemas potenciais:

### Problema 1: Inconsistência no Fallback de CDPRO
Na linha 3003, quando o fallback é ativado, usa `cdpro` (valor bruto do banco) ao invés de `cdpro_str` (string normalizada):

```python
# PROBLEMA:
codigo_aplicacao = cdprin_str if (...) else cdpro  # <-- deveria ser cdpro_str
```

### Problema 2: Encoding de Caracteres Especiais
O banco Firebird pode armazenar "APLICAÇÃO:" com encoding diferente (Latin-1, CP1252). O `texto_upper` pode resultar em algo como "APLICACˆO:" ou "APLICAÇAO:" dependendo do encoding.

### Problema 3: Falta de Debug Logging
Não há logs indicando quando a busca na FC03300 acontece e o que ela retorna.

---

## Solução

### Arquivo: `servidor.py`

#### Alteração 1: Corrigir fallback de CDPRO (linha 3003)

**Antes:**
```python
codigo_aplicacao = cdprin_str if (cdprin_str and cdprin_str != '0' and cdprin_str != cdpro_str) else cdpro
```

**Depois:**
```python
codigo_aplicacao = cdprin_str if (cdprin_str and cdprin_str != '0' and cdprin_str != cdpro_str) else cdpro_str
```

#### Alteração 2: Adicionar detecção robusta de "APLICAÇÃO" (linhas 3039-3051)

Usar normalização de texto para remover acentos antes da comparação:

```python
import unicodedata

def normalizar_texto(texto):
    """Remove acentos e normaliza texto para comparação"""
    if not texto:
        return ""
    # NFD decompõe caracteres acentuados
    normalizado = unicodedata.normalize('NFD', texto)
    # Remove marcas de acentuação (categoria 'Mn')
    return ''.join(c for c in normalizado if unicodedata.category(c) != 'Mn')
```

E usar na detecção:

```python
if not aplicacao:
    texto_normalizado = normalizar_texto(texto_upper)
    
    # Verifica prefixos COM e SEM acento
    if (texto_upper.startswith("APLICAÇÃO:") or 
        texto_upper.startswith("APLICACAO:") or
        texto_normalizado.startswith("APLICACAO:")):
        # Encontra posição do : para extrair o valor
        pos_dois_pontos = texto.find(':')
        if pos_dois_pontos > 0:
            aplicacao = texto[pos_dois_pontos + 1:].strip()
            print(f"  -> APLICAÇÃO (prefixo): '{aplicacao}'")
```

#### Alteração 3: Adicionar logs de debug (após linha 3011)

```python
print(f"\n  DEBUG FC03300 - Buscando aplicação em CDPRO={codigo_aplicacao}")
print(f"    Observações encontradas: {len(observacoes)}")
for obs in observacoes:
    print(f"    - FRFAR={obs[0]}, CDICP={obs[1]}, OBSER={str(obs[2])[:50]}...")
```

---

## Resumo das Mudanças

| Linha | Alteração |
|-------|-----------|
| 3003 | Trocar `cdpro` por `cdpro_str` no fallback |
| ~3005 (antes do loop) | Adicionar função `normalizar_texto()` ou import |
| 3039-3051 | Usar `texto.find(':')` para extrair aplicação de forma robusta |
| 3012 | Adicionar logs de debug para FC03300 |

---

## Resultado Esperado

Após as correções:

1. O sistema irá logar no console Flask: 
   ```
   DEBUG FC03300 - Buscando aplicação em CDPRO=92602
   Observações encontradas: 4
   - FRFAR=14, CDICP=00001, OBSER=APLICAÇÃO: SC...
   -> APLICAÇÃO (prefixo): 'SC'
   ```

2. O frontend exibirá:
   ```
   APLICAÇÃO: SC
   CONTÉM:
   REG: 154064
   ```

---

## Arquivo de Referência Atualizado

Após estas alterações, o servidor.py terá aproximadamente **3350 linhas**. O usuário deverá:

1. Copiar todo o servidor.py atualizado
2. Substituir o arquivo local
3. Reiniciar o Flask
4. Testar requisição 89489 novamente
