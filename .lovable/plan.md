
# Plano: Corrigir Extração de Aplicação da FC03300

## Problema Identificado

O print mostra a estrutura da tabela FC03300 (Observações de Ficha):

| Forma (FRFAR) | Código (CDICP) | Observação |
|---------------|----------------|------------|
| **14** | 00001 | **APLICAÇÃO: SC** ← Esta é a aplicação |
| T | 00001 | XANTAGOSIL C 1% (SUBST. TRIPEPTIDEO 1%), CAFEINA 2%, |
| T | 00002 | L CARNITINA 300MG, SILICIO ORGANICO 0,5% |
| T | 00003 | ETIQUETA (CATALOGO ESTETICA) - GORDURA... ← **IGNORAR** |

## Causa Raiz

A query atual na linha 3004-3009 não inclui a coluna **FRFAR**:
```python
SELECT CDICP, OBSER 
FROM FC03300 
WHERE CDPRO = ?
```

Isso faz com que a aplicação não seja identificada corretamente porque:
1. O sistema não distingue entre formas farmacêuticas (14, T, etc.)
2. A detecção atual só funciona se o texto começar exatamente com "APLICAÇÃO:"

## Solução

### Arquivo: `servidor.py`

#### Alteração 1: Incluir FRFAR na query FC03300 (linhas 3004-3009)

```python
cursor.execute("""
    SELECT FRFAR, CDICP, OBSER 
    FROM FC03300 
    WHERE CDPRO = ?
    ORDER BY FRFAR, CDICP
""", (codigo_aplicacao,))
```

#### Alteração 2: Melhorar processamento das observações (linhas 3013-3027)

```python
for obs in observacoes:
    frfar = str(obs[0]).strip() if obs[0] else ""
    cdicp = str(obs[1]).strip().zfill(5)
    texto = obs[2]
    if texto and hasattr(texto, 'read'):
        texto = texto.read().decode('latin-1')
    texto = texto.strip() if texto else ""
    
    if not texto:
        continue
    
    texto_upper = texto.upper()
    
    # =====================================================
    # IGNORA campos que contêm ETIQUETA, CATALOGO, etc.
    # =====================================================
    IGNORAR_OBS = ['ETIQUETA', 'CATALOGO', 'PREGA', 'SUG.', 'CATÁLOGO']
    if any(ignorar in texto_upper for ignorar in IGNORAR_OBS):
        print(f"    FC03300 IGNORADO: '{texto[:40]}...'")
        continue
    
    # =====================================================
    # EXTRAI APLICAÇÃO
    # Prioridade 1: Texto começa com "APLICAÇÃO:" ou "APLICACAO:"
    # Prioridade 2: Forma farmacêutica numérica (14, 1, etc.) com via direta
    # =====================================================
    if not aplicacao:
        if texto_upper.startswith("APLICAÇÃO:") or texto_upper.startswith("APLICACAO:"):
            aplicacao = texto[10:].strip()
            print(f"  -> APLICAÇÃO (prefixo): '{aplicacao}'")
        elif frfar.isdigit():  # Forma farmacêutica numérica (ex: 14)
            # Verifica se é via de administração direta
            vias_conhecidas = ['SC', 'IM', 'IV', 'ID', 'EV', 'IDSC', 'ID/SC', 'IM/SC', 
                               'SUBCUTANEA', 'INTRAMUSCULAR', 'INTRAVENOSA']
            for via in vias_conhecidas:
                if via in texto_upper:
                    aplicacao = via
                    print(f"  -> APLICAÇÃO (via direta em FRFAR={frfar}): '{aplicacao}'")
                    break
    
    # Campo 00004 = descrição do produto
    if cdicp == '00004' and not descricao_produto:
        descricao_produto = texto
```

## Resumo das Mudanças

| Linha | Alteração |
|-------|-----------|
| 3004-3009 | Adicionar `FRFAR` na query SELECT e ORDER BY |
| 3013-3027 | Processar FRFAR, ignorar ETIQUETA/CATALOGO, detectar vias diretas |

## Resultado Esperado

Após a correção, o sistema irá:

1. Ler o registro `FRFAR=14, CDICP=00001` com "APLICAÇÃO: SC"
2. Extrair `aplicacao = "SC"`
3. Ignorar registro com "ETIQUETA (CATALOGO...)"
4. O rótulo exibirá: `APLICAÇÃO: SC`

## Dados Que Serão Extraídos (do print)

Para o produto 92602:
- **Aplicação**: SC (de FRFAR=14, CDICP=00001)
- **Ativos**: XANTAGOSIL C 1%..., L CARNITINA 300MG... (da FC99999 ou FC03300 FRFAR=T)
- **Ignorado**: ETIQUETA (CATALOGO ESTETICA)...
