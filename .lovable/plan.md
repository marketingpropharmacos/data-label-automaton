
# Plano: Implementação de Kits (Terceira Fase)

## Resumo Executivo

Implementar a lógica de **Kits** para que o sistema gere um único rótulo contendo todos os componentes do kit, cada um com seu próprio pH, lote, fabricação e validade.

## Regra de Negócio

| Tipo | Características | Rótulo |
|------|-----------------|--------|
| **Produto Único** | 1 ativo, sem composição | Mostra só o nome do ativo |
| **Mescla** | Múltiplos ativos, compartilham metadados | Mostra composição única |
| **Kit** | Múltiplos ativos, cada um com metadados próprios | Um rótulo listando cada ativo com seu pH/lote/fab/val |

## Exemplo Visual (Kit com 4 itens)

```text
┌─────────────────────────────────────────────────────┐
│ PRO PHARMACOS                                       │
├─────────────────────────────────────────────────────┤
│ PACIENTE: MARIA SILVA         REQ: 86483-0         │
│ DR. JOÃO PEREIRA - CRM 12345/SP                    │
│                                                     │
│ CRISINA 30MCG/ML   pH:6.5  L:001/25  V:03/25       │
│ CAFEINA 2,5%       pH:7.0  L:002/25  V:03/25       │
│ L-CARNITINA 600MG  pH:6.8  L:003/25  V:04/25       │
│ PROCAINA 2%        pH:7.2  L:004/25  V:03/25       │
│                                                     │
│ APLICAÇÃO: IM                                       │
└─────────────────────────────────────────────────────┘
```

## Arquitetura da Solução

### 1. Backend (servidor.py)

**Identificação de Kit:**
- Consulta FC03100 para verificar se o código do produto tem componentes
- Se tiver componentes → é um KIT
- Se não tiver → mantém lógica atual (Produto Único ou Mescla)

**Busca de Componentes:**
```sql
SELECT CDPRO, DESCR FROM FC03100 WHERE CDPRO_PAI = ?
```

**Busca de Metadados por Componente:**
Para cada componente, buscar nas tabelas de lotes (FC06xxx ou FC07xxx):
- pH
- Lote
- Fabricação
- Validade

**Novo Campo de Resposta:**
```json
{
  "tipoItem": "KIT",
  "componentes": [
    {
      "nome": "CRISINA 30MCG/ML",
      "ph": "6.5",
      "lote": "001",
      "fabricacao": "01/25",
      "validade": "03/25"
    },
    ...
  ]
}
```

### 2. Frontend (tipos e componentes)

**Novo Tipo em requisicao.ts:**
```typescript
export interface ComponenteKit {
  codigo: string;
  nome: string;
  ph: string;
  lote: string;
  fabricacao: string;
  validade: string;
}

export interface RotuloItem {
  // ... campos existentes ...
  tipoItem: 'PRODUTO ÚNICO' | 'MESCLA' | 'KIT';
  componentes?: ComponenteKit[];  // Novo campo para kits
}
```

**Atualização do LabelCard.tsx:**
- Nova função `renderKitContent()` para exibir lista de componentes
- Cada componente em uma linha com seus metadados

## Etapas de Implementação

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Investigar estrutura FC03100 e tabelas de lotes | servidor.py |
| 2 | Criar endpoint de debug para componentes | servidor.py |
| 3 | Modificar endpoint `/api/requisicao` para identificar kits | servidor.py |
| 4 | Buscar e incluir componentes com metadados na resposta | servidor.py |
| 5 | Adicionar tipos TypeScript para componentes | requisicao.ts |
| 6 | Implementar renderização de kits no LabelCard | LabelCard.tsx |
| 7 | Ajustar layout AMP_CX para kits | layouts.ts |

## Seção Técnica

### Estrutura de Tabelas Esperada

**FC03100 (Componentes):**
| Coluna | Descrição |
|--------|-----------|
| CDPRO_PAI | Código do kit (ex: 2497) |
| CDPRO | Código do componente (ex: 92763) |
| DESCR | Descrição do componente |

**FC06xxx ou FC07xxx (Lotes):**
| Coluna | Descrição |
|--------|-----------|
| CDPRO | Código do produto |
| NRLOT | Número do lote |
| DTFAB | Data fabricação |
| DTVAL | Data validade |
| PH | pH do produto |

### Lógica de Identificação

```python
# No servidor.py
def identificar_tipo_item(cdpro, cursor):
    # Verifica se tem componentes na FC03100
    cursor.execute("""
        SELECT COUNT(*) FROM FC03100 
        WHERE CDPRO = ? OR CDPRO_PAI = ?
    """, (cdpro, cdpro))
    
    tem_componentes = cursor.fetchone()[0] > 0
    
    if tem_componentes:
        return "KIT"
    # ... lógica existente para MESCLA/PRODUTO ÚNICO
```

### Modificações no Frontend

```typescript
// LabelCard.tsx - nova função
const renderKitContent = () => {
  if (!rotulo.componentes || rotulo.componentes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0.5">
      {rotulo.componentes.map((comp, idx) => (
        <div key={idx} className="text-[9px] leading-tight">
          <span className="font-semibold">{comp.nome}</span>
          {comp.ph && <span> pH:{comp.ph}</span>}
          <span> L:{comp.lote}</span>
          <span> V:{comp.validade}</span>
        </div>
      ))}
    </div>
  );
};
```

## Próximos Passos após Aprovação

1. Investigar colunas exatas da FC03100 via debug
2. Identificar tabela correta de lotes/metadados
3. Implementar busca de componentes no backend
4. Testar com requisição 86483 (barras 0, 1, 2, 3 que são kits)
5. Implementar renderização no frontend
