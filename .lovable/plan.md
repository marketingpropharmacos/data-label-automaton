
# Plano: Corrigir Extração de APLICAÇÃO para Não-Kits

## Diagnóstico do Problema Real

Analisando a imagem do DBeaver (imagem-280) e o código:

| Campo na FC99999 | Conteúdo |
|------------------|----------|
| `ARGUMENTO` | OBSFIC9263814 |
| `PARAMETRO` | (vazio ou texto dos ativos) |
| **`DESCRPAR`** | **APLICACAO: ID, APLICACAO: SC, etc.** |

**Problema 1:** A query que busca ativos (linhas 2815-2823) **não inclui o campo DESCRPAR**:
```sql
SELECT ARGUMENTO, SUBARGUM, PARAMETRO  -- FALTA DESCRPAR!
FROM FC99999
```

**Problema 2:** O loop que processa os resultados (linha 2934) só lê `arg[2]` (PARAMETRO), ignorando completamente o `DESCRPAR` onde está a aplicação.

**Problema 3:** A função `buscar_aplicacao_nao_kit` faz uma query separada que até inclui DESCRPAR, mas usa `STARTING WITH 'OBSFIC{cdpro}'` onde cdpro tem 5 dígitos, enquanto os ARGUMENTOs reais têm 7+ dígitos (ex: OBSFIC9263814 vs OBSFIC92638).

---

## Solução

### Alteração 1: Incluir DESCRPAR na query principal (linhas 2815-2823)

**Antes:**
```sql
SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
FROM FC99999 
```

**Depois:**
```sql
SELECT ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
FROM FC99999 
```

### Alteração 2: Processar DESCRPAR para extrair APLICAÇÃO (linhas 2930-2961)

Adicionar leitura de `arg[3]` (DESCRPAR) e extrair aplicação quando conter "APLICAC":

```python
for arg in todos_args:
    argumento = arg[0]
    subargum = str(arg[1]).strip().zfill(5)
    texto = arg[2]  # PARAMETRO
    descrpar = arg[3] if len(arg) > 3 else None  # DESCRPAR (NOVO!)
    
    # Trata BLOB se necessário
    if texto and hasattr(texto, 'read'):
        texto = texto.read().decode('latin-1')
    texto = texto.strip() if texto else ""
    
    # NOVO: Trata DESCRPAR (também pode ser BLOB)
    if descrpar and hasattr(descrpar, 'read'):
        descrpar = descrpar.read().decode('latin-1')
    descrpar = descrpar.strip() if descrpar else ""
    
    # NOVO: Extrai APLICAÇÃO do campo DESCRPAR
    if not aplicacao_fc99999 and descrpar:
        descrpar_upper = descrpar.upper()
        if 'APLICAC' in descrpar_upper:
            if ':' in descrpar:
                aplicacao_fc99999 = descrpar.split(':', 1)[1].strip()
            else:
                aplicacao_fc99999 = descrpar.strip()
            print(f"  -> APLICAÇÃO extraída de DESCRPAR: '{aplicacao_fc99999}'")
```

### Alteração 3: Atualizar todas as queries que usam FC99999

Também atualizar as queries de fallback (linhas 2830-2835, 2866-2871) para incluir DESCRPAR:

```sql
SELECT ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
FROM FC99999 
WHERE ...
```

---

## Arquivos Alterados

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `servidor.py` | 2815-2823 | Adicionar `DESCRPAR` à query principal |
| `servidor.py` | 2830-2835 | Adicionar `DESCRPAR` à query CONTAINING |
| `servidor.py` | 2866-2871 | Adicionar `DESCRPAR` à query fallback CDPRO |
| `servidor.py` | 2930-2961 | Processar `arg[3]` (DESCRPAR) e extrair aplicação |

---

## Fluxo Corrigido

```text
Query FC99999 com ARGUMENTO CONTAINING '{cdpro}'
      │
      └─► Retorna: ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
              │
              └─► Loop em cada registro:
                      │
                      ├─► arg[2] = PARAMETRO → Extrai ativos/composição
                      │
                      └─► arg[3] = DESCRPAR → Se contém "APLICAC" → Extrai aplicação
```

---

## Garantias de Não-Regressão

- Não altera nada relacionado a KIT
- Usa a mesma lógica de busca que já funciona para ativos (CONTAINING)
- Apenas adiciona processamento do campo DESCRPAR que já vem na mesma query
- A função `buscar_aplicacao_nao_kit` pode ser removida ou mantida como fallback

---

## Resultado Esperado

Após implementação, o console Flask mostrará:
```
    - ARG: OBSFIC9263814, SUB: 00001, PARAM: ...
  -> APLICAÇÃO extraída de DESCRPAR: 'SC'
```

E o rótulo exibirá:
```
APLICAÇÃO: SC
```
