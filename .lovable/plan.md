# ✅ IMPLEMENTADO: Corrigir Logica de Identificacao de KITs no Backend

## Status: CONCLUÍDO

A lógica foi refatorada para usar FC12111 como fonte definitiva de identificação de KITs.

## Resumo do Problema (Resolvido)

O backend estava classificando itens como "PRODUTO UNICO" quando deveriam ser "KIT". Isso acontecia porque a logica antiga tentava detectar kits atraves de tabelas de cadastro (FC05000/FC05100, FC03600) que nao eram confiaveis para todos os casos.

## Solucao Implementada

Usar a tabela **FC12111** como fonte definitiva para identificacao de kits. Esta tabela contem a "explosao" do kit na requisicao - se existir registro em FC12111 para um determinado (NRRQU, SERIER, CDFIL), o item **e definitivamente um KIT**.

## Fluxo de Dados

```text
REQUISICAO (FC12100)
       |
       v
   ITENS (FC12110)
       |
   +---+---+
   |       |
   v       v
SERIER   SERIER
   1       2
   |       |
   v       v
Existe    Existe
FC12111?  FC12111?
   |         |
  SIM       NAO
   |         |
   v         v
  KIT    Produto/Mescla
```

## Mudancas Tecnicas

### 1. Nova Funcao `verificar_kit_fc12111`

Substitui a funcao `verificar_kit_completo` atual. A nova logica:

```text
ENTRADA: nrrqu, serier, cdfil, cursor

PASSO 1: Contar registros em FC12111
  SELECT COUNT(*) FROM FC12111 
  WHERE NRRQU = ? AND SERIER = ? AND CDFIL = ?

SE count > 0:
  RETORNA (True, []) -- E KIT, componentes serao buscados depois

SE count = 0:
  RETORNA (False, [])
```

### 2. Nova Funcao `buscar_componentes_kit_fc12111`

Busca os componentes de um kit identificado:

```text
ENTRADA: nrrqu, serier, cdfil, cursor

QUERY:
  SELECT c.CDPRO, c.CDPRIN, c.QUANT, c.UNIDADE, c.ORDCAP, c.TPCMP,
         p.DESCR
  FROM FC12111 c
  LEFT JOIN FC03000 p ON p.CDPRO = c.CDPRO
  WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
  ORDER BY c.ORDCAP

RETORNA: lista de componentes com nome
```

### 3. Nova Funcao `buscar_lote_componente`

Busca lote/fabricacao/validade de cada componente (duas estrategias com fallback):

```text
ESTRATEGIA A (preferencial):
  - Verificar se FC12111 tem campos NRLOT/CTLOT
  - Se sim, fazer LEFT JOIN com FC03140 usando esse lote

ESTRATEGIA B (fallback):
  - Buscar lote mais recente na FC03140 para o CDPRO do componente
  SELECT FIRST 1 NRLOT, CTLOT, DTFAB, DTVAL
  FROM FC03140 
  WHERE CDPRO = ? AND CDFIL = ?
  ORDER BY DTVAL DESC
```

### 4. Modificar Fluxo Principal em `/api/requisicao/<nr_requisicao>`

O processamento de cada SERIER passa a ser:

```text
PARA cada SERIER em itens_por_serier:
  1. Verificar se e KIT via FC12111
     - e_kit = verificar_kit_fc12111(nrrqu, serier, cdfil)
  
  2. SE e_kit:
     - componentes = buscar_componentes_kit_fc12111(nrrqu, serier, cdfil)
     - PARA cada componente:
       - dados_lote = buscar_lote_componente(cdpro_comp, nrrqu, serier, cdfil)
       - Montar objeto com ph, lote, fab, val
     - Montar rotulo com tipoItem = "KIT" e lista de componentes
  
  3. SE NAO e_kit:
     - Manter logica atual (MESCLA ou PRODUTO UNICO via FC99999/composicao)
```

### 5. Remover Heuristicas Quebradas

Atualmente o codigo em `verificar_kit_completo` usa:
- Busca por "KIT" no nome (linha 1807-1812)
- FC05000/FC05100 com CDSEM/CDFRM (linha 1814-1856)
- FC03600 com TPASS (linha 1861-1896)

Estas estrategias serao **removidas** ou movidas para fallback secundario.

### 6. Logs de Debug Esperados

Para cada SERIER processado, o sistema deve imprimir:

```text
[DEBUG] SERIER=9 CDPRO_PAI=92487
[DEBUG] FC12111 count=4 => KIT
[DEBUG] comp 92494 lote=... fab=... val=... (A)
[DEBUG] comp 92681 lote=... fab=... val=... (B)
...
```

Ou para nao-kits:

```text
[DEBUG] SERIER=1 CDPRO_PAI=12345
[DEBUG] FC12111 count=0 => NAO E KIT
```

## Estrutura JSON de Resposta para KIT

```text
{
  "tipoItem": "KIT",
  "nrItem": "9",
  "formula": "EMAG SUG 2",
  "componentes": [
    {
      "codigo": "92494",
      "nome": "HMB 50MG/2ML",
      "ph": "",
      "lote": "ABC123",
      "fabricacao": "01/25",
      "validade": "01/26"
    },
    {
      "codigo": "92681",
      "nome": "COENZIMA Q10",
      "ph": "",
      "lote": "DEF456",
      "fabricacao": "02/25",
      "validade": "02/26"
    }
  ]
}
```

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| servidor_completo.py | Refatorar funcao de deteccao de KIT, adicionar busca em FC12111 |

## Passos de Implementacao

1. Descobrir dinamicamente as colunas de FC12111 (para evitar "Column unknown")
2. Criar funcao `verificar_kit_fc12111` que conta registros na FC12111
3. Criar funcao `buscar_componentes_kit_fc12111` que retorna os componentes com nomes
4. Criar funcao `buscar_lote_componente` com estrategias A e B
5. Modificar o loop principal de processamento por SERIER
6. Adicionar logs de debug detalhados
7. Remover/simplificar a funcao `verificar_kit_completo` antiga

## Resultado Esperado

Apos a implementacao:
- O item "AMP EMAG SUG 2 2ML" (CDPRO 92487) sera identificado como **KIT**
- Os 4 componentes (92494, 92681, 92377, 92435) serao retornados com lote/fab/val
- O frontend recebera os dados corretos para renderizar o rotulo de kit

## Validacao

Apos substituir o servidor e reiniciar, testar com:
1. `http://localhost:5000/api/requisicao/89489?filial=279`
2. Verificar nos logs do terminal as linhas `[DEBUG] FC12111 count=...`
3. Confirmar que itens KIT aparecem com `tipoItem: "KIT"` e `componentes: [...]`
