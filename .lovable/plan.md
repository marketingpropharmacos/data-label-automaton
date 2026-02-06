

# Plano: Corrigir Fallback que Ignora a Filial Selecionada

## Problema Identificado

O endpoint `/api/requisicao` tem um **fallback** que busca a requisição em qualquer filial quando não encontra na filial especificada. Esse fallback usa `ORDER BY R.CDFIL` (crescente), então a filial 279 sempre vem antes da 392.

### Localização do Problema

**Arquivo**: `servidor.py`  
**Linhas**: 2534-2546

```python
# FALLBACK PROBLEMÁTICO:
if not row:
    cursor.execute("""
        SELECT ... FROM FC12100 R ...
        WHERE R.NRRQU = ?
        ORDER BY R.CDFIL  ← Retorna 279 antes de 392!
    """, (int(nr_requisicao),))
    row = cursor.fetchone()
    if row:
        filial_db = int(row[1])  ← Sobrescreve com 279!
```

### Fluxo Atual (Errado)

```text
1. Frontend: GET /api/requisicao/6806?filial=392
2. Query principal: WHERE NRRQU=6806 AND CDFIL=392
3. Resultado: NÃO encontra (possivelmente ordem de parâmetros ou timing)
4. Fallback: WHERE NRRQU=6806 ORDER BY CDFIL
5. Retorna: Filial 279 (GABRIELA M. DAMAZIO, DRA. MARIA PESSOA)
```

---

## Solução

Remover o fallback completamente ou torná-lo mais restritivo. Se a filial 392 foi especificada, o sistema NÃO deve retornar dados de outra filial.

### Opção Escolhida: Remover o Fallback

Se o usuário especificou filial 392, é porque quer dados dessa filial. Retornar dados da 279 é um comportamento inesperado.

### Alteração no Código

**Antes** (linhas 2530-2547):
```python
row = cursor.fetchone()

# Se não achou pela filial informada (ou mapeada), tenta localizar a requisição em qualquer filial.
# Isso evita 404 quando o frontend usa um código de filial diferente do CDFIL do banco.
if not row:
    cursor.execute("""
        SELECT R.NRRQU, R.CDFIL, R.NOMEPA, R.PFCRM, R.NRCRM, R.UFCRM,
               R.DTCAD, R.DTVAL, R.NRREG, R.POSOL, R.TPUSO, R.OBSERFIC,
               R.VOLUME, R.UNIVOL, M.NOMEMED, R.TPFORMAFARMA
        FROM FC12100 R
        LEFT JOIN FC04000 M ON R.PFCRM = M.PFCRM AND R.NRCRM = M.NRCRM AND R.UFCRM = M.UFCRM
        WHERE R.NRRQU = ?
        ORDER BY R.CDFIL
    """, (int(nr_requisicao),))
    row = cursor.fetchone()
    if row:
        filial_db = int(row[1])
```

**Depois**:
```python
row = cursor.fetchone()

# Fallback removido: se filial foi especificada, respeitar a escolha do usuário.
# Não buscar em outras filiais para evitar retornar dados incorretos.
```

---

## Passos de Implementação

1. Editar `servidor.py` (linhas 2532-2546)
2. Remover o bloco de fallback que busca em qualquer filial
3. Manter apenas o tratamento de "não encontrado" (404)

---

## Detalhes Técnicos

| Linha | Ação |
|-------|------|
| 2532-2546 | Remover bloco `if not row:` com fallback |

---

## Após Aprovação

1. Vou editar o arquivo `servidor.py`
2. Você copia para `C:\ServidorRotulos\servidor.py`
3. Reinicia o servidor Python
4. Testa: requisição 6806 com filial 392
5. Resultado esperado: médico "LENIE" (não mais "MARIA PESSOA")

---

## Impacto

- **Risco**: Baixo - apenas remove comportamento problemático
- **Benefício**: Filial selecionada será respeitada
- **Efeito colateral**: Se a requisição não existir na filial, retornará 404 (comportamento correto)

