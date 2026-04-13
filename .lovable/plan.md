

# WYSIWYG real para AMP10 — o que você edita é o que imprime

## Problema

Hoje, quando o `textoLivre` chega ao agente, a função `_render_amp10_text_line` **desmonta cada linha com regex** (procura `REQ:`, `pH:`, `L:`, `F:`, `V:`, `AP:`, `REG:`, etc.) e **força cada pedaço de volta para coordenadas X fixas** (x_left=14, x_req=196, x_lote=53…). Isso significa que qualquer edição manual — mudar espaçamento, mover um campo, adicionar texto livre — é ignorada na impressão porque o agente reconstrói a linha do zero.

## Solução

Trocar a lógica de reancoragem por **impressão literal linha-a-linha**: cada linha do `textoLivre` é enviada como uma única string contínua na posição X=14 (margem esquerda), exatamente como o editor mostra. Os espaços que o operador colocou no editor se tornam espaços reais na etiqueta impressa.

## O que será alterado

### 1. `agente_impressao.py` — simplificar `_gerar_from_texto_livre_amp10`

- Remover a chamada a `_render_amp10_text_line` (que faz o parsing/reancoragem)
- Substituir por lógica direta: para cada linha visível do `textoLivre`, gerar um único comando `ppla_text_dots(rot, font, 1, 1, y, x_left, linha_completa)`
- Manter o strip do recuo de 3 espaços da margem esquerda (que mapeia para X=14)
- Manter a expansão dinâmica de Y e o `lineSpacingFactor`
- Linhas vazias continuam sendo ignoradas (sem avançar Y)

### 2. Nenhuma outra alteração

- Nenhum layout será modificado (coordenadas Y, fonte, rotação — tudo fica igual)
- Nenhuma alteração no frontend
- A geração estruturada (quando não há `textoLivre`) continua usando as posições fixas do FC como fallback

## Resultado esperado

Se você editar o texto no editor e trocar "AP:IM/EV" por "AP:IM/SC", ou adicionar um espaço, ou mudar qualquer coisa — a etiqueta impressa refletirá exatamente o que está na tela.

