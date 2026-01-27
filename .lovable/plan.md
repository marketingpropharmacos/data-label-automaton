

# Plano: Correção da Extração de Ativos para SKINBOOSTER e Outros Produtos

## Diagnóstico do Problema

Analisando sua imagem e o código atual, identifiquei que:

- **SKINBOOSTER (Req 90198)**: CDPRO = 92781, CDPRIN = 92779
- Os ativos esperados são: **Hialuronato de Sódio** e **Monometiltricional**
- A lógica atual busca na FC99999 usando o CDPRIN (92779), mas os ativos não estão aparecendo no frontend

## Hipóteses do Problema

1. **ARGUMENTO na FC99999 não está no formato esperado**: O código busca por `OBSFIC92779` ou `92779`, mas os ativos podem estar em outro formato (ex: `OBSFIC9277914` com sufixo)

2. **Os ativos estão em outra tabela ou SUBARGUM diferente**: Podem não estar em SUBARGUM `00001`/`00002`

3. **Os ativos estão vinculados diretamente ao CDPRO (92781)** e não ao CDPRIN

## Plano de Investigação e Correção

### Etapa 1: Diagnóstico no Banco de Dados

Você precisa executar estas queries no IBExpert para descobrir onde os ativos estão:

```sql
-- Query 1: Buscar ativos pelo CDPRIN (92779)
SELECT * FROM FC99999 
WHERE ARGUMENTO CONTAINING '92779'
ORDER BY ARGUMENTO, SUBARGUM;

-- Query 2: Buscar pelo CDPRO (92781)
SELECT * FROM FC99999 
WHERE ARGUMENTO CONTAINING '92781'
ORDER BY ARGUMENTO, SUBARGUM;

-- Query 3: Buscar por "HIALURO" em qualquer tabela
SELECT * FROM FC99999 
WHERE PARAMETRO CONTAINING 'HIALURO';

-- Query 4: Verificar FC03300 para o produto
SELECT * FROM FC03300 
WHERE CDPRO IN (92779, 92781);
```

### Etapa 2: Correção no servidor.py

Baseado nos resultados das queries, vou corrigir a lógica de extração. As possíveis correções são:

**Opção A**: Se os ativos estiverem em SUBARGUM diferente (ex: `00003`, `00004`):
- Expandir a verificação de `['00001', '00002']` para incluir outros subargumentos

**Opção B**: Se os ativos estiverem vinculados ao CDPRO e não ao CDPRIN:
- Adicionar busca em ambos os códigos quando o primeiro não retornar ativos

**Opção C**: Se o ARGUMENTO tiver formato especial (ex: `OBSFIC9277900` com zeros extras):
- Melhorar a validação do CONTAINING para aceitar mais variações

### Etapa 3: Estrutura da Correção

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE BUSCA DE ATIVOS                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Buscar por CDPRIN (código base)                              │
│    └── FC99999 WHERE ARGUMENTO CONTAINING '92779'               │
│                                                                 │
│ 2. SE não encontrar ativos:                                     │
│    └── Buscar por CDPRO (código específico)                     │
│        └── FC99999 WHERE ARGUMENTO CONTAINING '92781'           │
│                                                                 │
│ 3. SE ainda não encontrar:                                      │
│    └── Buscar em FC03300 (observações do produto)               │
│                                                                 │
│ 4. Extrair ativos de TODOS SUBARGUMs relevantes                 │
│    └── 00001, 00002, 00003, 00004...                            │
└─────────────────────────────────────────────────────────────────┘
```

## Seção Técnica - Alterações Específicas no servidor.py

### Alteração 1: Busca em cascata (CDPRIN → CDPRO)

Na linha ~1254, após verificar que não encontrou ativos com CDPRIN, adicionar busca pelo CDPRO:

```python
# Se não encontrou ativos com CDPRIN, tenta com CDPRO
if not ativos_mescla and cdprin_str != cdpro_str:
    print(f"  -> Sem ativos com CDPRIN. Tentando CDPRO ({cdpro_str})...")
    cursor.execute("""
        SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
        FROM FC99999 
        WHERE ARGUMENTO CONTAINING ?
        ORDER BY ARGUMENTO, SUBARGUM
    """, (cdpro_str,))
    # ... processar resultados
```

### Alteração 2: Expandir SUBARGUMs aceitos

Na linha ~1286, mudar de verificação rígida para mais flexível:

```python
# ANTES:
elif subargum in ['00001', '00002']:

# DEPOIS: Aceita qualquer SUBARGUM que não seja aplicação
else:  # Qualquer outro SUBARGUM
    if "APLICA" not in texto_upper and texto.strip():
        # Verifica se parece com lista de ativos
        if any(ignorar in texto_upper for ignorar in IGNORAR_ATIVOS):
            continue
        ativos_mescla.append(texto_limpo)
```

### Alteração 3: Debug melhorado para troubleshooting

Adicionar endpoint de debug específico:

```python
@app.route('/api/debug/ativos/<cdpro>', methods=['GET'])
def debug_ativos(cdpro):
    """Debug completo de busca de ativos para um código"""
    # Busca em FC99999 e FC03300 com logs detalhados
```

## Próximos Passos

1. **Execute as queries** do passo 1 no IBExpert e me envie o resultado
2. Com base nos resultados, farei a correção específica no servidor.py
3. Você copia o arquivo atualizado para o servidor
4. Testamos a requisição 90198 novamente

**Esta abordagem resolve o problema de forma estruturada**: identificamos ONDE os dados estão antes de corrigir o COMO buscá-los.

