

# Redesign do Layout A_PAC_PEQ - Grade Fixa de Caracteres

## Objetivo
Reconfigurar exclusivamente a etiqueta A_PAC_PEQ para seguir um layout de grade fixa com posicionamento por coordenadas de caracteres, conforme o modelo fornecido.

## Layout Alvo (7 linhas, grade fixa)

```text
Linha 1: PACIENTE_________________ REQ:RRRRRRR
Linha 2: DR(A)MEDICO______________ CONSELHO____
Linha 3:                            REG:GGGGGGGG
Linha 4: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Linha 5: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Linha 6: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Linha 7: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Mudancas

### 1. Configuracao do Layout (src/config/layouts.ts)
- Habilitar campos que estavam ocultos: `registro` (visible: true)
- Atualizar `linhasMax: 7` (conforme modelo de 7 linhas)
- Manter `colunasMax: 27` (limite fisico da impressora confirmado anteriormente)
- Adicionar linhas ao array `linhas` para refletir a nova estrutura (registro na linha 3, linhas livres 4-7)

### 2. Geracao de Texto Especifico (src/components/LabelTextEditor.tsx)
- Adicionar funcao `generateTextPacPeq(rotulo, layoutConfig)` com logica especifica:
  - **Linha 1**: Nome do paciente + REQ na mesma linha, REQ alinhado a direita com padding de espacos
  - **Linha 2**: DR(A) + nome medico + conselho/CRM alinhado a direita na mesma linha
  - **Linha 3**: REG deslocado para a direita (preenchido com espacos a esquerda)
  - **Linhas 4-7**: Reservadas para conteudo livre (inicialmente vazias ou com dados extras)
- No `generateText`, detectar `layoutConfig.tipo === 'A_PAC_PEQ'` e desviar para essa funcao especifica
- Cada campo e truncado (cortado) no limite de colunas, nunca quebrado para a proxima linha

### 3. Comportamento de Edicao
- Para A_PAC_PEQ, o `wrapText` deve **truncar** (cortar no limite de colunas) em vez de quebrar linha
- Texto que ultrapasse o limite da grade e cortado, nao redistribuido
- O usuario pode editar livremente dentro dos 27 caracteres x 7 linhas

### 4. Funcao de Truncamento
- Criar `truncateText(text, maxCols, maxLines)` alternativa ao `wrapText`
- Cada linha e cortada em `maxCols` caracteres
- Maximo de `maxLines` linhas, excedentes descartadas

### Detalhes Tecnicos

**Funcao de alinhamento a direita dentro da linha:**
```
function padLine(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space <= 0) return (left + right).substring(0, width);
  return left + ' '.repeat(space) + right;
}
```

**Exemplo de geracao:**
```
Linha 1: padLine("MARIA SILVA", "REQ:6806-0", 27)
         -> "MARIA SILVA      REQ:6806-0"
Linha 2: padLine("DR(A)JOAO", "CRM-SP-1234", 27)
         -> "DR(A)JOAO        CRM-SP-1234"
Linha 3: padLine("", "REG:15079", 27)
         -> "                  REG:15079"
```

**Arquivos modificados:**
- `src/config/layouts.ts` - habilitar registro, ajustar linhasMax para 7
- `src/components/LabelTextEditor.tsx` - adicionar generateTextPacPeq, funcao truncateText, logica de padding

