

## Problema

No `generateTextPacGran` (frontend), a zona direita da Linha 2 tem largura fixa de 26 caracteres (`RIGHT_L2_WIDTH = 26`). Quando o conselho é longo (ex: `CREFITO-SP-104028`), a combinação `CREFITO-SP-104028 REG:24297` = 28 caracteres, ultrapassando o limite. O `fixedLine` trunca o bloco da direita em 26 chars, cortando o REG.

No agente, o mesmo pode ocorrer com `[:cols]` no bloco combinado.

## Solução

1. **`src/components/LabelTextEditor.tsx` — `generateTextPacGran`**: Aumentar `RIGHT_L2_WIDTH` de 26 para 32 (acomoda conselhos longos + REG). Reduzir `LEFT_L2` proporcionalmente — o nome do médico será truncado um pouco antes, o que é aceitável.

2. **`agente_impressao.py` — modo textoLivre**: Garantir que ao combinar conselho + REG no bloco direito, não haja truncamento por `[:cols]` — o bloco já é posicionado pela borda direita, então o limite de colunas não se aplica a ele.

3. **`agente_impressao.py` — modo estruturado**: Já funciona corretamente (linhas 913-921), mas verificar que o `right_block` não está sendo cortado.

## Arquivos
- `src/components/LabelTextEditor.tsx`
- `agente_impressao.py`

