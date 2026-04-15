

# Corrigir formatação de mesclas no AMP10

## Problema
No layout AMP10, mesclas estão sendo formatadas como kits — cada ingrediente numa linha separada. Isso faz o rótulo "estourar" as linhas disponíveis e perder informações como a linha de fórmula/descrição do produto.

O comportamento correto (conforme seu exemplo) é:
- **Composição**: ingredientes fluem numa string contínua, quebrando em novas linhas apenas quando excedem a largura da coluna
- **Fórmula + volume**: aparece após a composição (ex: `AUMENTO DA MASSA MAGRA + BCAA - 4ML`)

## Causa raiz
Linha 607-608 do `generateTextAmp10`: cada ingrediente separado por `,` é colocado numa linha independente (`partes.forEach(p => lines.push(indentLine(p)))`). Além disso, quando é mescla, a linha de fórmula é totalmente omitida.

## Alteração técnica

**Arquivo**: `src/components/LabelTextEditor.tsx` — função `generateTextAmp10`, bloco mescla (linhas ~603-613)

**De**:
```typescript
const partes = rotulo.composicao!.toUpperCase().split(', ').map(p => p.trim()).filter(Boolean);
partes.forEach(p => lines.push(indentLine(p)));
```

**Para**:
```typescript
// Composição como texto contínuo, quebrada por largura de coluna
const compText = rotulo.composicao!.toUpperCase();
wrapText(compText, CW, 3).split('\n').forEach(l => lines.push(indentLine(l)));

// Fórmula/descrição com volume (sem limpar sufixo ML)
const formulaRaw = (rotulo.formula || "").toUpperCase();
if (formulaRaw) lines.push(indentLine(formulaRaw));
```

Isso produz:
```
   L VALINA 24MG,L LEUCINA 24MG
   ISOLEUCINA 10MG,L ORNITINA 150MG, L CARNITINA 150MG,TAURINA 10%
   AUMENTO DA MASSA MAGRA + BCAA - 4ML
```

A mesma correção será aplicada ao bloco mescla do **AMP_CX** (linhas ~364-367) para manter consistência entre layouts de ampola.

## Resultado
Mesclas no AMP10 terão a composição fluindo naturalmente nas linhas disponíveis, seguida da descrição do produto com volume, idêntico ao padrão Formula Certa.

