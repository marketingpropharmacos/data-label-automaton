
# Plano: Corrigir Detecção de KIT - Filtrar o Próprio Produto

## Diagnóstico Confirmado

### O Bug Atual
Na função `detecta_kit()` (linhas 337-357), quando contamos os "ativos reais" dos componentes na FC05100:

```python
for comp in componentes:
    descr = comp[1] or ""
    if not is_embalagem_ou_obs(descr):
        ativos_reais += 1  # ← Conta QUALQUER coisa que não seja embalagem
```

**O problema**: O próprio produto (ex: "GLICOSE 75%") pode estar cadastrado como componente da sua própria fórmula na FC05100. Como "GLICOSE" não é embalagem, ela passa o filtro e conta como "ativo real".

### Exemplo Real
Produto: **GLICOSE 75% 2ML**

Componentes na FC05100:
| Componente | `is_embalagem_ou_obs()` | Contado? |
|------------|------------------------|----------|
| GLICOSE 75% | FALSE | ✅ SIM (1) |
| ÁGUA PARA INJETÁVEIS | TRUE | ❌ NÃO |
| AMPOLA ÂMBAR 2ML | TRUE | ❌ NÃO |
| SELO ALUMÍNIO 13MM | TRUE | ❌ NÃO |
| TAMPA BORRACHA | TRUE | ❌ NÃO |

**Resultado atual**: `ativos_reais = 1` → Deveria ser OK (precisa de 2+)

**MAS**: Se houver QUALQUER outro componente que não seja embalagem (ex: produto duplicado, outro insumo), chega a 2+ e classifica erroneamente como KIT.

---

## Solução: Adicionar Filtro de "Repetição do Produto"

### Lógica a Adicionar
Em `detecta_kit()`, quando contamos ativos reais, precisamos **também ignorar o próprio produto**:

```python
# Conta quantos componentes são "ativos reais" (não embalagem E não é o próprio produto)
ativos_reais = 0
for comp in componentes:
    cdpro_comp = comp[0]  # Código do componente
    descr = comp[1] or ""
    
    # Ignora se for embalagem
    if is_embalagem_ou_obs(descr):
        continue
    
    # NOVO: Ignora se for o próprio produto sendo consultado
    if str(cdpro_comp) == str(cdpro):
        print(f"    [DETECTA_KIT] Próprio produto ignorado: {descr[:50]}")
        continue
    
    ativos_reais += 1
```

### Alteração Alternativa (mais robusta)
Como fallback, também verificar pelo nome:

```python
# NOVO: Ignora se for repetição do nome do produto
def is_repeticao_produto_kit(descr_comp, descr_produto):
    """Verifica se o componente é apenas o próprio produto."""
    if not descr_comp or not descr_produto:
        return False
    
    # Normaliza ambos
    comp_norm = unicodedata.normalize('NFD', descr_comp.upper())
    prod_norm = unicodedata.normalize('NFD', descr_produto.upper())
    
    # Extrai palavras principais (ignora prefixos)
    palavras_prod = [p for p in prod_norm.split() 
                     if len(p) > 3 and p not in ['AMP', 'FRS', 'ENV', 'BIS']]
    
    if not palavras_prod:
        return False
    
    # Se a palavra principal do produto está no componente = é o mesmo
    return palavras_prod[0] in comp_norm
```

---

## Arquivos a Alterar

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `servidor.py` | 337-357 | Adicionar verificação de CDPRO do componente vs CDPRO consultado |
| `servidor.py` | 386-403 | Mesma alteração para estratégia 2 (busca por inteiro) |

---

## Código Corrigido

### Estratégia 1 (linhas 337-357)
```python
# Conta quantos componentes são "ativos reais" (não embalagem)
ativos_reais = 0
for comp in componentes:
    cdpro_comp = comp[0]  # Código do componente
    descr = comp[1] or ""
    if hasattr(descr, 'read'):
        descr = descr.read().decode('latin-1')
    
    # 1. Ignora embalagens
    if is_embalagem_ou_obs(descr):
        print(f"    [DETECTA_KIT] Embalagem ignorada: {descr[:50]}")
        continue
    
    # 2. NOVO: Ignora se for o próprio produto (código igual)
    if str(cdpro_comp).strip() == cdpro_str:
        print(f"    [DETECTA_KIT] Próprio produto ignorado: {descr[:50]}")
        continue
    
    ativos_reais += 1
    print(f"    [DETECTA_KIT] Componente ativo: {descr[:50]}")

# Só é KIT se tiver 2+ componentes ativos reais DIFERENTES do próprio produto
if ativos_reais >= 2:
    print(f"  [DETECTA_KIT] ✓ KIT VÁLIDO! {ativos_reais} ativos reais encontrados")
    return kit_info
else:
    print(f"  [DETECTA_KIT] ✗ Não é KIT: apenas {ativos_reais} ativo(s) real(is)")
    return None
```

### Estratégia 2 (linhas 386-403)
Mesma lógica aplicada à busca por CDPRO inteiro.

---

## Fluxo Corrigido

### GLICOSE 75% (Item Único)
```text
GLICOSE 75% 2ML (CDPRO=12345)
      │
      └─► detecta_kit(12345)
              │
              └─► FC05100: Busca componentes do CDFRM
                      │
                      ├─► CDPRO=12345 "GLICOSE 75%"  → CDPRO == CONSULTADO → IGNORA
                      ├─► "ÁGUA PARA INJETÁVEIS"     → is_embalagem = TRUE → IGNORA
                      ├─► "AMPOLA ÂMBAR"             → is_embalagem = TRUE → IGNORA
                      ├─► "SELO ALUMÍNIO"            → is_embalagem = TRUE → IGNORA
                      └─► "TAMPA BORRACHA"           → is_embalagem = TRUE → IGNORA
                      
              └─► ativos_reais = 0
                      │
                      └─► Retorna None (NÃO É KIT) ✅
```

### KIT INTRADERMO (Kit Verdadeiro)
```text
KIT INTRADERMO (CDPRO=99999)
      │
      └─► detecta_kit(99999)
              │
              └─► FC05100: Busca componentes do CDFRM
                      │
                      ├─► CDPRO=11111 "LIDOCAÍNA 2%" → CDPRO ≠ 99999 → ATIVO ✅
                      ├─► CDPRO=22222 "BICARBONATO"  → CDPRO ≠ 99999 → ATIVO ✅
                      ├─► "ÁGUA ESTÉRIL"             → is_embalagem = TRUE → IGNORA
                      └─► CDPRO=33333 "HIALURONIDASE"→ CDPRO ≠ 99999 → ATIVO ✅
                      
              └─► ativos_reais = 3
                      │
                      └─► Retorna kit_info (É KIT VÁLIDO) ✅
```

---

## Garantias

1. **KITs verdadeiros continuam funcionando** - Componentes diferentes do produto principal são contados
2. **Itens únicos não viram KIT** - O próprio produto é ignorado da contagem
3. **Mesclas não afetadas** - Lógica separada
4. **Aplicação não afetada** - Extração independente

---

## Resultado Esperado

**GLICOSE 75% 2ML (após correção):**
```
Retorno da API:
{
  "tipoItem": "PRODUTO ÚNICO",
  "componentes": [],
  "aplicacao": "EV"
}

Rótulo:
AMP GLICOSE 75% – 2ML
APLICAÇÃO: EV
L: 272989/25  F: 06/05/2028  V: ...
```

Sem água, sem ampola, sem selo, sem tampa!
