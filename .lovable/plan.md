

# Correcao: OBSFIC para Kit Sinonimo

## Problema

A funcao `extrair_composicao_componente` atual aplica filtros agressivos (is_ativo_mescla, is_embalagem_ou_obs, is_subtitulo_obs_ficha) projetados para extrair ingredientes individuais de mesclas. Para kits sinonimos, isso descarta o texto clinico/operacional que deveria aparecer no rotulo.

O resultado: composicao retorna vazio e o frontend faz fallback para o nome do produto (DESCR), que e incorreto para kits sinonimos.

## Solucao

### 1. Nova funcao no backend: `extrair_obsfic_componente`

Criar uma funcao dedicada em `servidor.py` que busca as observacoes de ficha (OBSFIC) de um componente de kit **sem filtros de ingredientes**:

```python
def extrair_obsfic_componente(cursor, cdpro_comp):
    """
    Busca OBSFIC (observacoes de ficha) de um componente na FC99999.
    Retorna o texto concatenado por ordem de SUBARGUM, sem filtragem de ativos.
    Usado EXCLUSIVAMENTE para kits sinonimos.
    """
    cdpro_str = str(cdpro_comp).strip()
    
    # Busca com ARGUMENTO = 'OBSFIC<CDPRO>'
    cursor.execute("""
        SELECT PARAMETRO FROM FC99999 
        WHERE ARGUMENTO STARTING WITH ?
        ORDER BY SUBARGUM
    """, (f'OBSFIC{cdpro_str}',))
    
    registros = cursor.fetchall()
    
    # Se nao encontrou, tenta com CDPRO padded
    if not registros:
        cdpro_padded = cdpro_str.zfill(8)
        cursor.execute("""
            SELECT PARAMETRO FROM FC99999 
            WHERE ARGUMENTO STARTING WITH ?
            ORDER BY SUBARGUM
        """, (f'OBSFIC{cdpro_padded}',))
        registros = cursor.fetchall()
    
    # Concatena textos, filtrando apenas linhas de aplicacao
    textos = []
    for reg in registros:
        texto = reg[0]
        if texto and hasattr(texto, 'read'):
            texto = texto.read().decode('latin-1')
        texto = texto.strip() if texto else ""
        if texto and not texto.upper().startswith("APLICAC"):
            textos.append(texto)
    
    return ", ".join(textos)
```

### 2. Alterar `montar_kit_expandido` para receber flag `e_sinonimo`

Adicionar parametro `e_sinonimo` a funcao `montar_kit_expandido`. Quando `e_sinonimo=True`, usar `extrair_obsfic_componente` em vez de `extrair_composicao_componente` para cada componente.

Nos dois blocos onde a composicao e buscada (linhas ~1142 e ~1167):

```python
if e_sinonimo:
    composicao_comp = extrair_obsfic_componente(cursor, cdpro_comp)
else:
    composicao_comp = extrair_composicao_componente(cursor, cdpro_comp)
```

### 3. Atualizar chamada de `montar_kit_expandido`

Na chamada existente no loop principal (~linha 3730), passar o flag:

```python
kit_data = montar_kit_expandido(cursor, cdpro_resolvido, cdfrm, cdfil, nrrqu, serier, e_sinonimo)
```

### 4. Frontend - Sem alteracoes

O `LabelCard.tsx` ja tem a logica correta: quando `eSinonimo=true`, usa `comp.composicao` (que agora tera o texto OBSFIC). Nenhuma mudanca necessaria no frontend.

## Arquivos Modificados

- `servidor.py` - nova funcao + alteracao em `montar_kit_expandido`

## Resultado Esperado

Kit sinonimo (req 6806-2) exibira o texto clinico das observacoes de ficha (ex: "ACIDO HIALURONICO N RETIC. 5MG") em vez do nome do produto (ex: "POLIREVITALIZANTE AC HIA 2").
