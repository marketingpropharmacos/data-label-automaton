
# Plano: Corrigir Extração de APLICAÇÃO - Remover Filtro SQL

## Diagnóstico

Analisando as imagens e o código, o problema está na função `buscar_aplicacao_nao_kit()`:

1. **Query atual (linha 56-63):**
```sql
WHERE ARGUMENTO STARTING WITH ?
  AND (UPPER(PARAMETRO) CONTAINING 'APLIC'
       OR UPPER(DESCRPAR) CONTAINING 'APLIC')
```

2. **Problema:** O texto no banco é "**APLICAÇÃO: SC**" com cedilha (Ç). O Firebird pode não converter "Ç" para "C" corretamente no `UPPER()`, fazendo o filtro `CONTAINING 'APLIC'` falhar.

3. **Evidência:** A imagem mostra que os ativos (XANTAGOSIL, CAFEINA, etc.) estão sendo extraídos corretamente do mesmo registro, mas a linha com "Forma Farmacêutica = 14" que contém "APLICAÇÃO: SC" não está sendo capturada.

---

## Solução

Modificar a função `buscar_aplicacao_nao_kit()` para:

1. **Buscar TODOS os registros** do ARGUMENTO (sem filtro `CONTAINING 'APLIC'`)
2. **Filtrar no Python** usando normalização Unicode (que já funciona para os ativos)

---

## Alterações no servidor.py

### Função `buscar_aplicacao_nao_kit` (linhas 56-100)

**Antes:**
```python
cursor.execute("""
    SELECT FIRST 10 ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
    FROM FC99999
    WHERE ARGUMENTO STARTING WITH ?
      AND (UPPER(PARAMETRO) CONTAINING 'APLIC'
           OR UPPER(DESCRPAR) CONTAINING 'APLIC')
    ORDER BY ARGUMENTO, SUBARGUM
""", (argumento,))
```

**Depois:**
```python
# Busca TODOS os registros do ARGUMENTO (sem filtro SQL)
# O filtro será feito no Python com normalização Unicode
cursor.execute("""
    SELECT FIRST 50 ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
    FROM FC99999
    WHERE ARGUMENTO STARTING WITH ?
    ORDER BY ARGUMENTO, SUBARGUM
""", (argumento,))
```

### Adicionar normalização Unicode no filtro Python (linhas 82-96)

```python
import unicodedata

for reg in registros:
    # ... (processamento de BLOB)
    
    # Normaliza texto removendo acentos para comparação
    for campo in [texto, descrpar]:
        if not campo:
            continue
        
        # Normalização para remover acentos (APLICAÇÃO -> APLICACAO)
        campo_normalizado = ''.join(
            c for c in unicodedata.normalize('NFD', campo.upper()) 
            if unicodedata.category(c) != 'Mn'
        )
        
        if 'APLICAC' in campo_normalizado:
            # Extrai após ":"
            if ':' in campo:
                valor = campo.split(':', 1)[1].strip()
            else:
                valor = campo.strip()
            
            if valor and valor not in aplicacoes:
                aplicacoes.append(valor)
                print(f"  [APLICAÇÃO NÃO-KIT] Encontrado: '{valor}'")
```

---

## Fluxo Corrigido

```text
Requisição 89489 (Mescla)
      │
      └─► buscar_aplicacao_nao_kit(cursor, 92602)
              │
              └─► Query: WHERE ARGUMENTO STARTING WITH 'OBSFIC92602'
                      │
                      └─► Retorna TODOS os registros (sem filtro SQL)
                              │
                              ├─► SUBARGUM=14, PARAMETRO="APLICAÇÃO: SC"
                              │       │
                              │       └─► Normaliza: "APLICACAO: SC"
                              │               └─► Contém "APLICAC"? SIM → Extrai "SC"
                              │
                              ├─► SUBARGUM=T, PARAMETRO="XANTAGOSIL..."
                              │       └─► Não contém "APLICAC" → Ignora
                              │
                              └─► ... outros registros
```

---

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `servidor.py` | Modificar função `buscar_aplicacao_nao_kit` (linhas 56-100) |

---

## Resultado Esperado

Console Flask mostrará:
```
  [APLICAÇÃO NÃO-KIT] Tentando ARGUMENTO STARTING WITH 'OBSFIC92602'
  [APLICAÇÃO NÃO-KIT] Encontrados 15 registros
  [APLICAÇÃO NÃO-KIT] Encontrado: 'SC' em OBSFIC9260214
  [APLICAÇÃO] Usando busca não-kit: 'SC'
```

Rótulo exibirá:
```
APLICAÇÃO: SC
```
