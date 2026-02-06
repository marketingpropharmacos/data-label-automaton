

# Plano: Corrigir Funções Duplicadas e Parâmetros Faltando

## Problema Crítico Encontrado

O arquivo `servidor.py` tem **funções duplicadas com o mesmo nome**, o que causa erro no Flask:

```
Linha 1264: def debug_verificar_requisicao(nr_requisicao)
Linha 1477: def debug_verificar_requisicao(nr_requisicao)  ← DUPLICADO!
```

Quando o Python carrega o arquivo, a **segunda função sobrescreve a primeira**, mas o decorator `@app.route` pode já ter registrado a rota com a função errada, causando comportamento imprevisível.

Além disso, ainda há **6 queries sem conversão int()**:

| Linha | Endpoint | Parâmetro sem int() |
|-------|----------|---------------------|
| 1380 | `/api/debug/formulas` | `(nr_requisicao, filial)` |
| 1412 | `/api/debug/produtos-requisicao` | `(nr_requisicao, filial)` |
| 1612 | `/api/debug/observacoes-requisicao` | `(nr_requisicao, filial)` |
| 1622 | `/api/debug/observacoes-requisicao` | `(nr_requisicao, filial)` |
| 1661 | `/api/debug/verificar-obs-requisicao` | `(nr_requisicao, filial)` |
| 1671 | `/api/debug/verificar-obs-requisicao` | `(nr_requisicao, filial)` |

---

## Solução em 2 Etapas

### Etapa 1: Remover Função Duplicada

**Ação**: Excluir a segunda definição de `debug_verificar_requisicao` (linhas 1475-1522)

A primeira versão (linhas 1262-1309) está correta e completa.

### Etapa 2: Adicionar int() nas Queries Restantes

**Arquivo**: `servidor.py`

| Linha | Antes | Depois |
|-------|-------|--------|
| 1380 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |
| 1412 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |
| 1612 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |
| 1622 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |
| 1661 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |
| 1671 | `""", (nr_requisicao, filial))` | `""", (int(nr_requisicao), int(filial)))` |

---

## Resumo das Alterações

1. **Remover linhas 1475-1522** - função duplicada `debug_verificar_requisicao`
2. **Linha 1380** - adicionar `int()` na query
3. **Linha 1412** - adicionar `int()` na query
4. **Linha 1612** - adicionar `int()` na query
5. **Linha 1622** - adicionar `int()` na query
6. **Linha 1661** - adicionar `int()` na query
7. **Linha 1671** - adicionar `int()` na query

---

## Detalhes Técnicos

### Por que a duplicação causa erro?

Python permite redefinir funções, mas o Flask usa os decorators `@app.route` para registrar rotas. Quando você tem:

```python
@app.route('/api/debug/verificar-requisicao/<nr_requisicao>')
def debug_verificar_requisicao(nr_requisicao):
    # versão 1
    pass

@app.route('/api/debug/verificar-requisicao/<nr_requisicao>')  
def debug_verificar_requisicao(nr_requisicao):
    # versão 2
    pass
```

O Flask pode:
1. Registrar a rota duas vezes (erro)
2. Sobrescrever a primeira função com a segunda
3. Causar comportamento inconsistente

### Por que int() é necessário?

O driver `fdb` do Firebird precisa de tipos Python compatíveis com as colunas do banco:
- Coluna `INTEGER` no banco = precisa de `int` no Python
- String "6806" pode falhar ou retornar vazio
- Inteiro 6806 sempre funciona

---

## Teste Após Correção

1. **Copiar** o `servidor.py` corrigido para seu computador
2. **Parar** o servidor (Ctrl+C)
3. **Reiniciar** o servidor
4. **Testar**: `http://localhost:5000/api/requisicao/6806?filial=392`

---

## Impacto

- **Risco**: Baixo - apenas remove código duplicado e adiciona conversão de tipos
- **Benefício**: Resolve 404 e erros de função duplicada
- **Compatibilidade**: Nenhuma quebra de funcionalidade

