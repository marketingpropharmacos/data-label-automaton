

# Corrigir WYSIWYG do A.PAC.PEQ — mesma lógica do AMP10

## Problema
O A.PAC.PEQ **não é WYSIWYG**. Quando o operador edita o texto no sistema, o agente ignora a edição porque o bloco `textoLivre` (linhas 899-943 do `agente_impressao.py`) faz decomposição com regex — detecta REQ:, REG:, CRM e re-ancora cada pedaço em coordenadas fixas, truncando nomes em 25 chars.

Resultado: qualquer alteração manual é reprocessada e a etiqueta sai sempre igual.

O AMP10, por outro lado, usa `_gerar_from_texto_livre_amp10` que imprime cada linha **literalmente** sem parsing. Por isso as edições funcionam no AMP10 mas não no PEQ.

## Solução
Substituir o bloco textoLivre do A.PAC.PEQ pela mesma abordagem literal do AMP10/A.PAC.GRAN:
- Cada linha do editor → um comando PPLA em X=12
- Sem regex, sem decomposição, sem truncamento forçado
- O que aparece na tela é exatamente o que sai na etiqueta

## Alteração técnica
**Arquivo**: `agente_impressao.py` — função `gerar_ppla_a_pac_peq`, bloco `if texto_livre:` (linhas 899-943)

Substituir todo o bloco de regex/ancoragem por impressão literal:

```python
texto_livre = rotulo.get('textoLivre', '')
if texto_livre:
    linhas_texto = [l for l in texto_livre.split('\n') if l.strip()]
    pplb_lines = []
    for idx, line_text in enumerate(linhas_texto):
        y = y_positions[idx] if idx < len(y_positions) else y_positions[-1]
        stripped = line_text.strip()
        # WYSIWYG: imprimir cada linha literal em X=12, sem decomposição
        pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, stripped[:cols]))
    if not pplb_lines:
        pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y_positions[0], x_paciente, 'SEM DADOS'))
    return _build_label_ppla(pplb_lines, cal)
```

## O que NÃO muda
- Coordenadas, fontes, dimensões do layout (travados)
- Modo estruturado (sem textoLivre) continua com ancoragem de REQ/REG/CRM
- Outros layouts não são afetados
- Frontend não precisa de alteração

## Resultado esperado
Qualquer edição feita no editor do A.PAC.PEQ será impressa exatamente como aparece na tela, igual ao comportamento do AMP10.

