

# Plano: Corrigir Prioridade do Lote para NRLOT

## Problema Confirmado

O print do DBeaver mostra claramente:
- **CTLOT** = numeros pequenos (196, 189, 172, 93...) - ID interno de controle
- **NRLOT** = numeros maiores (10416, 10404, 10395, 10160...) - Numero do lote comercial

O sistema atual usa `ctlot or nrlot`, priorizando CTLOT. Precisa inverter para `nrlot or ctlot`.

## Mudanca no servidor.py

### Funcao `resolve_lote_componente()` (linha ~280)

**Antes:**
```python
lote = str(ctlot or nrlot or "").strip()
```

**Depois:**
```python
lote = str(nrlot or ctlot or "").strip()
```

### Locais de Correcao

Existem 3 lugares no servidor.py onde essa logica pode aparecer:

1. **Funcao `resolve_lote_componente()`** - principal
2. **Funcao `buscar_lote_componente()`** - se existir versao duplicada
3. **Funcao `buscar_componentes_kit_fc12111()`** - quando processa lote inline

Em todos esses locais, a prioridade deve ser NRLOT primeiro.

## Resultado Esperado

Apos a correcao, os rotulos de KIT mostrarao:
- Lote: **10416** (em vez de 196)
- Lote: **10160** (em vez de 93)

Exatamente como aparece na coluna NRLOT do seu banco de dados.

