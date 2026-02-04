

# Plano: Corrigir Identificacao de KITs com Descoberta Dinamica de Colunas

## Diagnostico do Problema

Os logs mostram claramente:

```text
[KIT] Estratégia 1: FC05000 WHERE CDSEM = '92487'
[KIT ERRO GERAL] Column unknown: CDSEM
-> TIPO: PRODUTO ÚNICO
```

Dois problemas identificados:

1. **Arquivo local desatualizado**: A funcao `verificar_kit_fc12111()` foi adicionada ao arquivo servidor.py aqui no Lovable, mas o servidor local NAO foi atualizado. Por isso, os logs nao mostram `[FC12111] Verificando KIT...` - esse codigo simplesmente nao esta sendo executado.

2. **Coluna CDSEM nao existe**: A funcao `buscar_cdfrm_do_kit()` usa a coluna `CDSEM` diretamente, mas essa coluna nao existe neste banco de dados. Precisa de descoberta dinamica de colunas.

## Solucao

### Parte 1: Confirmar que as funcoes FC12111 existem

As funcoes ja foram adicionadas ao servidor.py:
- `verificar_kit_fc12111()` (linhas 1596-1622) - verifica se e KIT contando registros na FC12111
- `buscar_componentes_kit_fc12111()` (linhas 1624-1723) - busca componentes com lote/fab/val
- `buscar_lote_componente()` (linhas 1725-1738) - busca lote mais recente na FC03140

E a chamada esta no lugar correto (linha 2184):
```python
e_kit_fc12111 = verificar_kit_fc12111(cursor, nr_requisicao, serier, filial)
```

### Parte 2: Corrigir funcao buscar_cdfrm_do_kit (fallback)

A funcao `buscar_cdfrm_do_kit()` precisa usar descoberta dinamica de colunas para evitar erros quando CDSEM nao existe.

Mudanca na linha 1752-1758:

**Antes**:
```python
cursor.execute("""
    SELECT CDFRM, CDSEM FROM FC05000 
    WHERE CDSEM = ?
""", (cdpro_str,))
```

**Depois**:
```python
# Descobre colunas da FC05000
cursor.execute("""
    SELECT TRIM(RDB$FIELD_NAME) 
    FROM RDB$RELATION_FIELDS 
    WHERE RDB$RELATION_NAME = 'FC05000'
""")
colunas_fc05000 = [row[0] for row in cursor.fetchall()]

# Identifica coluna do produto semi-acabado
col_semi = None
for col in ['CDSEM', 'CDPRO', 'CDSEMI', 'CDPRODUTO']:
    if col in colunas_fc05000:
        col_semi = col
        break

# Executa query apenas se coluna existir
if col_semi:
    cursor.execute(f"SELECT CDFRM FROM FC05000 WHERE {col_semi} = ?", (cdpro_str,))
```

### Parte 3: Usuario precisa atualizar o arquivo local

Apos eu fazer as correcoes, o usuario precisa:
1. Copiar o conteudo atualizado do servidor.py
2. Substituir o arquivo em `C:\ServidorRotulos\servidor.py`
3. Reiniciar o servidor Flask

## Mudancas no Codigo

| Arquivo | Localizacao | Mudanca |
|---------|-------------|---------|
| servidor.py | Linhas 1752-1812 | Adicionar descoberta dinamica de colunas em `buscar_cdfrm_do_kit()` |

## Fluxo de Identificacao (atual correto)

```text
ITEM (SERIER=9)
     |
     v
verificar_kit_fc12111() -- [PRIORIDADE 1]
     |
   count > 0?
     |
  SIM: KIT
     |
  NAO: Fallback para buscar_cdfrm_do_kit() -- [PRIORIDADE 2]
             |
          Usa descoberta dinamica de colunas
             |
          Encontrou CDFRM? -> KIT via FC05100
             |
          NAO encontrou -> PRODUTO UNICO ou MESCLA
```

## Logs Esperados (apos correcao)

Para SERIER=9 (CDPRO=92487):
```text
[FC12111] Verificando KIT: NRRQU=89489, SERIER=9, CDFIL=279
[FC12111] count=4 => KIT
[FC12111] Buscando componentes: NRRQU=89489, SERIER=9, CDFIL=279
[FC12111] 4 componentes encontrados
  -> IDENTIFICADO COMO KIT via FC12111!
```

## Resultado Esperado

Apos aplicar as correcoes e reiniciar o servidor:
- Barras 8 e 9 serao identificadas como KIT
- Cada KIT tera seus componentes com lote/fabricacao/validade
- Frontend exibira os ativos de cada kit corretamente

