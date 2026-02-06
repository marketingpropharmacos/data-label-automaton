
# Plano: Corrigir Erro "cannot access local variable 'unicodedata'"

## Diagnóstico

O erro exibido no console do servidor Python é:
```
'Irro: cannot access local variable 'unicodedata' where it is not associated with a value
```

### Causa Raiz

No arquivo `servidor.py`, o módulo `unicodedata` está importado **duas vezes**:

1. **Globalmente (correto)** - Linha 39:
   ```python
   import unicodedata
   ```

2. **Localmente dentro de um bloco if (problemático)** - Linha 3259:
   ```python
   if not aplicacao_fc99999 and descrpar:
       import unicodedata  # ← PROBLEMA AQUI
   ```

Em Python, quando você faz um `import` dentro de um bloco condicional, o interpretador tenta resolver a variável localmente primeiro. Se o bloco ainda não foi executado ou o import não ocorreu por alguma razão, a variável fica "unbound" (não associada a um valor), causando o erro.

---

## Solução

**Remover o import local** da linha 3259, pois o módulo já está importado globalmente.

### Arquivo: `servidor.py`

| Linha | Ação |
|-------|------|
| 3259 | **REMOVER** a linha `import unicodedata` |

---

## Alteração Específica

**Antes (linhas 3258-3264):**
```python
if not aplicacao_fc99999 and descrpar:
    import unicodedata
    descrpar_normalizado = ''.join(
        c for c in unicodedata.normalize('NFD', descrpar.upper()) 
        if unicodedata.category(c) != 'Mn'
    )
```

**Depois:**
```python
if not aplicacao_fc99999 and descrpar:
    descrpar_normalizado = ''.join(
        c for c in unicodedata.normalize('NFD', descrpar.upper()) 
        if unicodedata.category(c) != 'Mn'
    )
```

---

## Verificação Adicional

Preciso verificar se há outros `import unicodedata` locais no arquivo que possam causar o mesmo problema.

Da busca anterior, confirmei que existe apenas **1 import local problemático** na linha 3259. O import na linha 39 é global e correto.

---

## Impacto

- **Risco**: Nenhum - apenas remove um import redundante
- **Funcionalidade**: O `unicodedata` já está disponível globalmente
- **Compatibilidade**: Nenhuma quebra de código

---

## Teste

Após a correção:
1. Reiniciar o servidor Python
2. Buscar a requisição 6806 novamente
3. O erro `cannot access local variable 'unicodedata'` não deve mais aparecer
