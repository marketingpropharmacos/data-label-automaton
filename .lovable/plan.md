

## Diagnóstico

**Problema central**: O agente de impressão usa `enumerate()` para iterar pelas linhas do `textoLivre`, mas pula linhas vazias com `continue` sem resetar o contador. Como o A_PAC_GRAN tem `linhasMax=5` e apenas 2 linhas com conteúdo, o editor envia 5 linhas (2 com texto + 3 vazias). O resultado:

```text
pos_idx=0: "SUSANE ZANINI          REQ:009740-0"  → Y=89 ✓
pos_idx=1: ""  → skip
pos_idx=2: ""  → skip  
pos_idx=3: ""  → skip
pos_idx=4: "DR(A)SUSANE ZANINI   CRBM-PR-4556 REG:23993" → Y=45 ✗ (deveria ser Y=78)
```

A linha do médico vai para Y=45 (dots) em vez de Y=78, caindo fora da área visível da etiqueta ou ficando tão distante que parece "apagada".

**Problema secundário**: `CRBM` (Conselho Regional de Biomedicina) está ausente da regex de conselhos no agente, impedindo a extração correta do conselho quando presente.

---

## Plano de correção

### 1. Agente (`agente_impressao.py`) — Corrigir contagem de posição Y

Na função `gerar_ppla_a_pac_gran`, trocar o `pos_idx` do `enumerate` por um contador separado (`visible_idx`) que só incrementa para linhas não-vazias:

```python
visible_idx = 0
for line_text in linhas_texto:
    stripped = line_text.strip()
    if not stripped:
        continue
    y = y_positions_calc[visible_idx] if visible_idx < len(y_positions_calc) else y_positions_calc[-1]
    # ... parsing existente ...
    visible_idx += 1
```

Isso garante: Linha 1 → Y=89, Linha 2 → Y=78 (independente de quantas linhas vazias existam no meio).

### 2. Agente (`agente_impressao.py`) — Adicionar CRBM à regex de conselhos

Adicionar `CRBM` ao pattern de detecção de conselhos (linha 817):

```python
r'((?:CRM|CRBM|COREN|CRO|CRF|CRMV|CRN|CREFITO|CREF|CRP|CRFA)-\S+)'
```

### 2 arquivos alterados

- `agente_impressao.py` — fix do `pos_idx` e adição de `CRBM` na regex

