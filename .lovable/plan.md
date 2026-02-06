
# Plano: Corrigir Query com Coluna Inexistente (CDPAC)

## Problema

O erro SQL -206 "Column unknown FC12100.CDPAC" indica que a query no endpoint `/api/requisicao` está tentando usar colunas que não existem na tabela FC12100 do seu banco de dados Firebird.

### Query Atual (ERRADA) - linhas 2550-2582

```sql
SELECT 
    fc12100.NRRQU,
    fc12100.CDPRO,    -- Pode não existir
    fc12100.CDPAC,    -- NÃO EXISTE!
    fc12100.CDMED,    -- Pode não existir
    ...
FROM FC12100
LEFT JOIN FC02000 ON fc12100.CDPAC = fc02000.CDPAC  -- CDPAC não existe!
LEFT JOIN FC03000 ON fc12100.CDMED = fc03000.CDMED
...
```

### Query Correta (do servidor_completo.py que funcionava)

```sql
SELECT R.NRRQU, R.CDFIL, R.NOMEPA, R.PFCRM, R.NRCRM, R.UFCRM,
       R.DTCAD, R.DTVAL, R.NRREG, R.POSOL, R.TPUSO, R.OBSERFIC,
       R.VOLUME, R.UNIVOL, M.NOMEMED, R.TPFORMAFARMA
FROM FC12100 R
LEFT JOIN FC04000 M ON R.PFCRM = M.PFCRM AND R.NRCRM = M.NRCRM AND R.UFCRM = M.UFCRM
WHERE R.NRRQU = ? AND R.CDFIL = ?
```

---

## Solução

Restaurar a query original do endpoint `/api/requisicao` para usar as colunas corretas que existem na tabela FC12100.

### Alterações no arquivo servidor.py

**Linhas afetadas**: 2550-2600 (aproximadamente)

#### Mudanças:

1. **Substituir toda a query SELECT** (linhas 2550-2582) pela query original que funciona
2. **Ajustar os índices** no mapeamento de dados_base para corresponder às colunas corretas
3. **Remover JOINs desnecessários** (FC02000, FC03000, FC05000, FC09000, FC18000)
4. **Manter apenas o JOIN** com FC04000 (tabela de médicos)

---

## Detalhes Técnicos

### Colunas que EXISTEM na FC12100:
- NRRQU (número requisição)
- CDFIL (código filial)
- NOMEPA (nome paciente)
- PFCRM, NRCRM, UFCRM (dados do médico)
- DTCAD, DTVAL (datas)
- NRREG (registro)
- POSOL (posologia)
- TPUSO (tipo uso)
- OBSERFIC (observações)
- VOLUME, UNIVOL
- TPFORMAFARMA

### Colunas que NÃO EXISTEM (causam erro):
- CDPAC (código paciente separado)
- CDMED (código médico separado)
- CDPRO (na requisição principal)

---

## Passos da Implementação

1. Localizar o endpoint `/api/requisicao` (linha 2531)
2. Substituir a query (linhas 2550-2582) pela versão correta
3. Atualizar o mapeamento de `dados_base` (linhas 2598-2620)

---

## Após Aprovação

1. Farei as edições no `servidor.py`
2. Você copia o arquivo atualizado para `C:\ServidorRotulos\servidor.py`
3. Reinicia o servidor Python
4. Testa a requisição 6806 com filial 392
5. Resultado esperado: dados corretos sem erro HTTP 500
