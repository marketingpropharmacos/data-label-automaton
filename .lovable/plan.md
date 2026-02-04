
# Plano: Detecção de KITs via FC05000.CDSAC (IMPLEMENTADO)

## Vínculos Corretos (confirmados via SQL)

```text
FC05000.CDSAC = CDPRO do item na requisição (produto kit/semi-acabado)
FC05000.CDFRM = código da fórmula do kit
FC05100.CDFRM → lista de componentes (CDPRO dos ativos)
FC03000.DESCR/NOMRED = descrição do produto
FC03140 = lotes/datas
```

## Funções Implementadas

### 1. `detecta_kit(cursor, cdpro, tpforma=None)`
- Query: `SELECT FIRST 1 CDFRM, CDSAC, DESCRFRM, TPFORMAFARMA FROM FC05000 WHERE CDSAC = ?`
- Retorna dict com `{cdfrm, cdsac, descrfrm, tpforma}` se for kit, None caso contrário

### 2. `componentes_do_kit(cursor, cdfrm)`
- Query: `SELECT k.CDPRO, p.DESCR, p.NOMRED FROM FC05100 k LEFT JOIN FC03000 p ON p.CDPRO = k.CDPRO WHERE k.CDFRM = ? ORDER BY p.DESCR`
- Retorna lista de dicts com `{cdpro, descr, nomred}`

### 3. `resolve_lote_componente(cursor, cdfil, cdpro)`
- Query: `SELECT FIRST 1 CTLOT, NRLOT, DTFAB, DTVAL FROM FC03140 WHERE CDFIL = ? AND CDPRO = ? AND (DTVAL IS NULL OR DTVAL >= CURRENT_DATE) ORDER BY DTVAL DESC, DTFAB DESC`
- Retorna dict com `{lote, dtFab, dtVal}`

### 4. `tenta_fc12111_componentes(cursor, nrrqu, cdfil, serier)`
- Verifica se FC12111 tem registros para a requisição
- Se encontrar, retorna componentes na ordem de ORDCAP
- Fallback para FC05100 se não encontrar

### 5. `montar_kit_expandido(cursor, cdpro, cdfil, nrrqu, serier)`
- Função principal que encapsula toda a lógica
- Usa FC12111 como prioridade, fallback para FC05100
- Resolve lotes via FC03140

## Endpoint de Debug

```
GET /api/debug/kit/<cdsac>?filial=279
```

Retorna:
```json
{
  "success": true,
  "data": {
    "cdsac": "92487",
    "filial": "279",
    "isKit": true,
    "kitInfo": {
      "cdfrm": 2515,
      "cdsac": 92487,
      "descrfrm": "...",
      "tpforma": "..."
    },
    "componentes": [
      {"cdpro": 92494, "descr": "...", "lote": "...", "dtFab": "...", "dtVal": "..."},
      ...
    ],
    "sql_tests": [...]
  }
}
```

## Formato de Saída JSON (endpoint /api/requisicao)

```json
{
  "nrItem": "8",
  "formula": "AMP REDUTOR GORD LOC LIPO KIT",
  "tipoItem": "KIT",
  "isKit": true,
  "componentes": [
    {"codigo": "92636", "nome": "BENZOPIRONA", "lote": "110", "fabricacao": "01/01/2025", "validade": "01/01/2026"},
    ...
  ],
  "kit": {
    "cdsac": 92761,
    "cdfrm": 4043,
    "descricaoKit": "...",
    "componentes": [
      {"cdpro": 92636, "descr": "AMP BENZOPIRONA 0,5MG/ML 2ML", "lote": "110", "dtFab": "01/01/2025", "dtVal": "01/01/2026"},
      ...
    ]
  }
}
```

## Logs Esperados

```text
[DETECTA_KIT] Verificando CDPRO=92487 na FC05000.CDSAC
[DETECTA_KIT] ✓ KIT ENCONTRADO! CDFRM=2515, CDSAC=92487
[COMPONENTES_KIT] Buscando componentes para CDFRM=2515
[COMPONENTES_KIT] 8 componentes encontrados
  [COMP] CDPRO=92494, DESCR=AMP...
  [LOTE] CDPRO=92494: LT=110, F=01/01/2025, V=01/01/2026
[KIT] ✓ SERIER=8 detectado via FC05000.CDSAC com 8 componentes
```

## Status: ✅ IMPLEMENTADO

Funções adicionadas ao início do `servidor.py` (após `get_db_connection`).
Endpoint de debug `/api/debug/kit/<cdsac>` adicionado.
Integração no endpoint `/api/requisicao/<nr>` realizada.
