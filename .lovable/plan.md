
# Plano: Correções no Frontend e Backend para Mesclas e KITs

## Resumo das Alterações

Este plano aborda três problemas identificados:

1. Remover prefixo "AMP" dos nomes de componentes de KIT no frontend
2. Exibir TODAS as observações/ativos das mesclas (não apenas a primeira)
3. Garantir que a APLICAÇÃO apareça para todos os tipos: mesclas, kits e produtos únicos

---

## Alteração 1: Remover "AMP" dos Nomes de Componentes de KIT

### Arquivo: `src/components/LabelCard.tsx`

O frontend já possui a função `formatarFormula()` que remove o prefixo "AMP", mas ela não está sendo usada para os nomes de componentes de kit. 

### Implementação

Criar uma nova função auxiliar para limpar nomes de componentes:

```typescript
// Nova função para limpar nome de componente (remove "AMP", "FRS", etc.)
const formatarNomeComponente = (nome: string): string => {
  if (!nome) return "";
  let limpo = nome.trim().toUpperCase();
  
  // Remove prefixos de embalagem comuns
  const prefixos = ["AMP ", "FRS ", "FR ", "BIS ", "ENV "];
  for (const prefixo of prefixos) {
    if (limpo.startsWith(prefixo)) {
      limpo = limpo.substring(prefixo.length);
      break;
    }
  }
  
  return limpo;
};
```

### Locais de Uso

1. **`generateKitText()`** (linha 197-198):
   - Antes: `const compLine: string[] = [comp.nome.toUpperCase()];`
   - Depois: `const compLine: string[] = [formatarNomeComponente(comp.nome)];`

2. **`renderKitContent()`** (linha 401):
   - Antes: `<span className="font-semibold uppercase">{comp.nome}</span>`
   - Depois: `<span className="font-semibold uppercase">{formatarNomeComponente(comp.nome)}</span>`

---

## Alteração 2: Exibir TODAS as Observações da Mescla

### Arquivo: `servidor.py`

### Problema Atual

Na linha 2948, quando o item é classificado como mescla, o sistema usa apenas o primeiro ativo:

```python
composicao = primeiro_ativo  # Só usa o primeiro!
```

### Implementação

Alterar para concatenar TODOS os ativos encontrados na FC99999:

```python
# Em vez de usar só o primeiro ativo:
# composicao = primeiro_ativo

# Concatena TODOS os ativos separados por vírgula
composicao = ", ".join(ativos_mescla)
```

### Localização

Linhas 2946-2952 do `servidor.py` - dentro do bloco `if e_mescla:`

---

## Alteração 3: Garantir Aplicação para Mesclas, KITs e Produtos Únicos

### Problema Atual

1. A aplicação é buscada na FC99999 e FC03300
2. Porém, linhas 3027-3029 limpam a aplicação se tiver mais de 30 caracteres ou vírgulas:
   ```python
   if len(aplicacao) > 30 or ',' in aplicacao:
       aplicacao = ""
   ```
3. Isso pode estar removendo aplicações válidas

### Arquivo: `servidor.py`

### Implementação

1. **Flexibilizar a regra de limpeza** (linha 3027-3029):
   - Aumentar o limite de 30 para 50 caracteres
   - Manter validação de vírgulas (indica lista de ativos, não aplicação)

```python
# Limpa aplicação se for muito longa ou contiver vírgulas (indica lista de ativos)
# Aumentado limite de 30 para 50 caracteres
if len(aplicacao) > 50 or ',' in aplicacao:
    aplicacao = ""
```

2. **Verificar busca de aplicação para mesclas usando CDPRIN**:

   Atualmente a busca em FC03300 (linhas 3002-3007) usa apenas CDPRO:
   ```python
   cursor.execute("""
       SELECT CDICP, OBSER 
       FROM FC03300 
       WHERE CDPRO = ?
   """, (cdpro,))
   ```

   Alterar para priorizar CDPRIN (código base) quando disponível:
   ```python
   # Usa CDPRIN se disponível, senão CDPRO
   codigo_aplicacao = cdprin_str if (cdprin_str and cdprin_str != '0' and cdprin_str != cdpro_str) else cdpro
   
   cursor.execute("""
       SELECT CDICP, OBSER 
       FROM FC03300 
       WHERE CDPRO = ?
       ORDER BY CDICP
   """, (codigo_aplicacao,))
   ```

---

## Resumo das Mudanças por Arquivo

### `src/components/LabelCard.tsx`
| Linha | Alteração |
|-------|-----------|
| ~138 | Adicionar função `formatarNomeComponente()` |
| ~198 | Usar `formatarNomeComponente(comp.nome)` em `generateKitText()` |
| ~401 | Usar `formatarNomeComponente(comp.nome)` em `renderKitContent()` |

### `servidor.py`
| Linha | Alteração |
|-------|-----------|
| 2948 | Mudar `composicao = primeiro_ativo` para `composicao = ", ".join(ativos_mescla)` |
| 3001-3007 | Usar CDPRIN para buscar aplicação em FC03300 |
| 3028 | Aumentar limite de 30 para 50 caracteres |

---

## Resultado Esperado

### KITs (antes/depois)
```text
ANTES:                              DEPOIS:
AMP BENZOPIRONA 0,5MG/ML 2ML       BENZOPIRONA 0,5MG/ML 2ML
AMP L CARNITINA 600MG/2ML          L CARNITINA 600MG/2ML
AMP LIP. DESOXICOLATO 60MG         LIP. DESOXICOLATO 60MG
```

### Mesclas (antes/depois)
```text
ANTES (só 1 observação):
TRIPEPTÍDEO 1%, LIPOSSOMAS DE AC. DEOXICÓLICO 30MG,

DEPOIS (todas as observações):
TRIPEPTÍDEO 1%, LIPOSSOMAS DE AC. DEOXICÓLICO 30MG, SILÍCIO 0,5%, PENTOXIFILINA 20MG
```

### Aplicação (para todos os tipos)
```text
APLICAÇÃO: SC
APLICAÇÃO: IM
```

---

## Observações Técnicas

1. A lógica de KIT permanece inalterada conforme solicitado
2. As mudanças no frontend afetam apenas a exibição, não a estrutura de dados
3. As mudanças no backend melhoram a extração de dados sem quebrar compatibilidade
4. A função `formatarNomeComponente()` é similar à existente `formatarFormula()` mas focada em componentes
