
# Plano: Buscar APLICAÇÃO para Não-Kits via FC99999

## Objetivo

Restaurar a extração do campo "APLICAÇÃO" exclusivamente para **ATIVOS ÚNICOS** e **MESCLAS**, sem alterar nenhum aspecto do fluxo de KIT que já funciona corretamente.

---

## Diagnóstico

Analisando o código atual (linhas 2820-2890 e 3040-3142), identifiquei que:

1. A busca de aplicação na **FC99999** tenta prefixos como `APLICA{cdpro}`, `APLICACAO{cdpro}`, `VIA{cdpro}` — que não existem no banco
2. A busca inline procura por `APLICAÇÃO:` no texto do campo `PARAMETRO`
3. A busca na **FC03300** também não encontra registros para os produtos testados
4. **Falta**: buscar registros `OBSFIC{cdpro}` onde o campo `PARAMETRO` ou `DESCRPAR` **contém** a palavra "APLIC"

Conforme sua instrução, a fonte correta é:
- Tabela: **FC99999**
- Filtro: `ARGUMENTO = 'OBSFIC{cdpro}'`
- Condição: `UPPER(PARAMETRO) CONTAINING 'APLIC' OR UPPER(DESCRPAR) CONTAINING 'APLIC'`

---

## Solução

### 1. Criar função isolada `buscar_aplicacao_nao_kit()`

Adicionar no início do arquivo (junto às outras funções helper), uma função dedicada:

```python
def buscar_aplicacao_nao_kit(cursor, cdpro_int):
    """
    Busca APLICAÇÃO na FC99999 para itens NÃO-KIT.
    Retorna string com a aplicação ou None se não encontrar.
    """
    if not cdpro_int:
        return None
    
    cdpro_str = str(cdpro_int)
    
    # Variações do argumento OBSFIC (com diferentes padding de zeros)
    argumentos_tentar = [
        f"OBSFIC{cdpro_str}",
        f"OBSFIC0{cdpro_str}",
        f"OBSFIC00{cdpro_str}",
    ]
    
    aplicacoes = []
    
    for argumento in argumentos_tentar:
        try:
            cursor.execute("""
                SELECT FIRST 5 ARGUMENTO, SUBARGUM, PARAMETRO, DESCRPAR
                FROM FC99999
                WHERE ARGUMENTO = ?
                  AND (UPPER(PARAMETRO) CONTAINING 'APLIC'
                       OR UPPER(DESCRPAR) CONTAINING 'APLIC')
                ORDER BY SUBARGUM
            """, (argumento,))
            
            registros = cursor.fetchall()
            
            for reg in registros:
                # PARAMETRO (índice 2)
                texto = reg[2]
                if texto and hasattr(texto, 'read'):
                    texto = texto.read().decode('latin-1')
                texto = (texto or "").strip()
                
                # DESCRPAR (índice 3)
                descrpar = reg[3]
                if descrpar and hasattr(descrpar, 'read'):
                    descrpar = descrpar.read().decode('latin-1')
                descrpar = (descrpar or "").strip()
                
                # Extrai valor após "APLICAÇÃO:" ou "APLICACAO:"
                for campo in [texto, descrpar]:
                    if not campo:
                        continue
                    campo_upper = campo.upper()
                    
                    if 'APLIC' in campo_upper:
                        # Tenta extrair após ":"
                        if ':' in campo:
                            valor = campo.split(':', 1)[1].strip()
                        else:
                            valor = campo.strip()
                        
                        if valor and valor not in aplicacoes:
                            aplicacoes.append(valor)
                            print(f"  [APLICAÇÃO NÃO-KIT] Encontrado: '{valor}' em {argumento}")
            
            if aplicacoes:
                break  # Encontrou, não precisa tentar próximas variações
                
        except Exception as e:
            print(f"  [APLICAÇÃO NÃO-KIT] Erro ao buscar {argumento}: {e}")
            continue
    
    if aplicacoes:
        return " | ".join(aplicacoes)
    
    return None
```

### 2. Chamar a função apenas para NÃO-KIT

Na linha **~3040** (após determinar `e_kit`), adicionar a chamada condicional:

**Antes (linha 3040):**
```python
aplicacao = aplicacao_fc99999
```

**Depois:**
```python
# APLICAÇÃO: usa FC99999 apenas para NÃO-KIT
if not e_kit:
    # Tenta busca específica para não-kit (OBSFIC + APLIC)
    aplicacao_nao_kit = buscar_aplicacao_nao_kit(cursor, cdpro)
    if aplicacao_nao_kit:
        aplicacao = aplicacao_nao_kit
        print(f"  [APLICAÇÃO] Usando busca não-kit: '{aplicacao}'")
    else:
        # Fallback para busca já existente
        aplicacao = aplicacao_fc99999
        print(f"  [APLICAÇÃO] Usando fallback FC99999: '{aplicacao}'")
else:
    # KIT: mantém comportamento atual (não alterar!)
    aplicacao = aplicacao_fc99999
```

---

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `servidor.py` | Adicionar função `buscar_aplicacao_nao_kit()` (nova, ~50 linhas) |
| `servidor.py` | Modificar chamada de `aplicacao = aplicacao_fc99999` para usar a nova função apenas se `not e_kit` |

---

## Fluxo Final

```text
Item da requisição
      │
      ├─► É KIT? ─────► SIM ─► Mantém fluxo atual (nenhuma alteração)
      │
      └─► NÃO (Ativo Único ou Mescla)
              │
              └─► buscar_aplicacao_nao_kit(cursor, cdpro)
                      │
                      ├─► Tenta OBSFIC{cdpro}
                      ├─► Tenta OBSFIC0{cdpro}
                      ├─► Tenta OBSFIC00{cdpro}
                      │
                      └─► Extrai texto onde PARAMETRO ou DESCRPAR contém "APLIC"
```

---

## Garantias de Não-Regressão

- **NÃO ALTERA** lógica de explosão de kit
- **NÃO ALTERA** query de kit
- **NÃO ALTERA** payload de kit
- **NÃO ALTERA** aplicação do kit
- A nova função é **isolada** e só é chamada dentro de `if not e_kit`

---

## Resultado Esperado

Após implementação:

1. **KIT**: continua exatamente igual (sem alteração)
2. **Ativo Único**: exibe aplicação extraída de FC99999 (OBSFIC + APLIC)
3. **Mescla**: exibe aplicação extraída de FC99999 (OBSFIC + APLIC)

Console Flask mostrará:
```
  [APLICAÇÃO NÃO-KIT] Encontrado: 'SC' em OBSFIC92487
  [APLICAÇÃO] Usando busca não-kit: 'SC'
```
