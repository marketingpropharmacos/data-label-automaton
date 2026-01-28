
# Plano: Correção da Busca de Componentes de Kits

## Resumo

Corrigir a lógica no backend para buscar componentes de kits na tabela **FC12111** (sub-itens de requisição) em vez de FC03100 (que é tabela de estoque).

## Descoberta

A tabela `FC12111` vincula:
- `NRRQU` (número requisição) + `SERIER` (barra do kit) → aos `CDPRO` (componentes)

## Arquitetura da Solução

```text
FC12100 (Requisição 89129)
    │
    └── FC12110 (Itens)
            │
            ├── SERIER=0: Kit 2499
            │       │
            │       └── FC12111 (Componentes do Kit)
            │               ├── CDPRO: 92376 (Tripeptídeo)
            │               ├── CDPRO: 92580 (Silox)
            │               ├── CDPRO: 92803 (Ioimbina)
            │               └── CDPRO: 92766 (Procaína)
            │
            ├── SERIER=1: Produto único
            └── SERIER=2: Mescla
```

## Mudanças no Backend (servidor.py)

### 1. Nova Função: buscar_componentes_kit_fc12111

```python
def buscar_componentes_kit_fc12111(cursor, nrrqu, serier, cdfil):
    """
    Busca componentes de um kit na FC12111
    """
    cursor.execute("""
        SELECT 
            c.CDPRO,
            c.CDPRIN,
            c.QUANT,
            c.UNIDADE,
            c.ORDCAP,
            p.NOMRED
        FROM FC12111 c
        LEFT JOIN FC03000 p ON c.CDPRO = p.CDPRO
        WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
        ORDER BY c.ORDCAP
    """, (nrrqu, serier, cdfil))
    
    return cursor.fetchall()
```

### 2. Modificar Lógica de Identificação

No endpoint `/api/requisicao`:
- Após buscar cada item da FC12110
- Verificar se existe registro na FC12111 para aquele NRRQU + SERIER
- Se existir → é KIT, buscar componentes
- Se não existir → manter lógica atual (Mescla/Produto Único)

### 3. Buscar Metadados de Cada Componente

Para cada componente encontrado na FC12111:
- Buscar pH, lote, fabricação e validade nas tabelas FC06100/FC07100
- Usar o CDPRO do componente para a busca

## Fluxo de Execução

```text
1. Recebe requisição (ex: 89129)
2. Busca itens na FC12110 (ex: barra 0, 1, 2, 3)
3. Para cada item:
   a. Busca componentes na FC12111 (WHERE NRRQU=89129 AND SERIER=barra)
   b. Se encontrou componentes:
      - tipoItem = "KIT"
      - Para cada componente: buscar nome (FC03000) e metadados (FC06100/FC07100)
   c. Se não encontrou:
      - Manter lógica atual (Mescla ou Produto Único)
4. Retorna dados com componentes populados
```

## Estrutura de Resposta JSON

```json
{
  "nrRequisicao": "89129",
  "nrItem": "0",
  "tipoItem": "KIT",
  "formula": "AMP KIT GORD LOC COX/C",
  "componentes": [
    {
      "codigo": "92376",
      "nome": "TRIPEPTÍDEO 1 30MCG/ML",
      "ph": "6.5",
      "lote": "001/25",
      "fabricacao": "01/25",
      "validade": "03/25"
    },
    {
      "codigo": "92580",
      "nome": "SILOX",
      "ph": "7.0",
      "lote": "002/25",
      "fabricacao": "01/25",
      "validade": "03/25"
    }
  ]
}
```

## Etapas de Implementação

| # | Tarefa | Status |
|---|--------|--------|
| 1 | Criar endpoint de debug para testar FC12111 | ✅ Completo |
| 2 | Implementar função `buscar_componentes_kit_fc12111()` | ✅ Completo |
| 3 | Modificar endpoint `/api/requisicao` para usar FC12111 | ✅ Completo |
| 4 | Buscar nome do componente na FC03000 | ✅ Completo |
| 5 | Buscar metadados (pH/lote) na FC06100/FC07100 | ✅ Completo |
| 6 | Testar com requisição que contenha kit | ⏳ Pendente |

## Endpoints de Debug

**Novo endpoint para validação:**
```
GET /api/debug/fc12111/<nrrqu>/<serier>?filial=279
```

Exemplo: `http://localhost:5000/api/debug/fc12111/89129/0?filial=279`

## Seção Técnica

### Query Principal (FC12111)

```sql
SELECT 
    c.CDPRO,
    c.CDPRIN,
    c.QUANT,
    c.ORDCAP,
    p.NOMRED as NOME_COMPONENTE
FROM FC12111 c
LEFT JOIN FC03000 p ON c.CDPRO = p.CDPRO
WHERE c.NRRQU = 89129 
  AND c.SERIER = 0 
  AND c.CDFIL = 279
ORDER BY c.ORDCAP
```

### Query de Metadados por Componente

```sql
SELECT PH, NRLOT, DTFAB, DTVAL
FROM FC06100
WHERE CDPRO = ? AND CDFIL = ?
ORDER BY DTVAL DESC
ROWS 1
```

## Resultado Esperado

Ao buscar requisição 89129:
- Barra 0 (kit 2499): Retorna `tipoItem: "KIT"` com array de 4 componentes
- Cada componente com seu próprio pH, lote, fabricação e validade
- Frontend renderiza lista de componentes no rótulo
