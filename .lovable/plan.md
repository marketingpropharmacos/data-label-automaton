

# Corrigir truncamento do CRM no A.PAC.PEQ

## Problema
A linha do médico (`DR(A)CAROLINA F.M.D. SOUZA  CRM-RS-22250`) tem ~43 caracteres, mas a etiqueta física comporta apenas 41. O agente trunca em 41 chars, cortando o CRM.

O REQ e o REG já são tratados como âncoras separadas (X=116 e X=129), mas o CRM na linha 2 é impresso como texto contínuo e truncado.

## Solução
Aplicar a **mesma lógica de âncora** usada para REQ/REG ao CRM na linha do médico: detectar o padrão `CRM-` (ou conselho similar) via regex e dividi-lo em dois comandos PPLA separados:
- Parte esquerda (nome do médico) em X=12
- Parte direita (CRM) ancorada em X=116 (mesmo do REQ)

## Alteração técnica
**Arquivo**: `agente_impressao.py` — função `gerar_ppla_a_pac_peq`, bloco WYSIWYG (texto_livre)

Adicionar detecção de padrão conselho (CRM/COREN/CRF etc.) antes do fallback "linha normal":

```python
# Detectar conselho (CRM-XX-NNNNN) ancorado à direita
crm_match = _re.search(r'((?:CRM|COREN|CRF|CNE)\S+)', stripped)
if crm_match:
    left_part = stripped[:crm_match.start()].rstrip()
    crm_part = crm_match.group(1)
    if left_part:
        pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, left_part[:25]))
    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_req, crm_part))
    continue
```

Isso vai antes da linha `# Linha normal (DR(A)... + conselho)`, garantindo que o CRM nunca seja truncado.

## O que NÃO muda
- Coordenadas, fontes, dimensões do layout (tudo travado)
- Lógica de REQ e REG (já funciona)
- Outros layouts (não afetados)
- Texto exibido no editor (continua igual)

## Resultado esperado
A etiqueta impressa mostrará `CRM-RS-22250` completo, ancorado à direita na mesma posição do REQ, sem sobreposição com o nome do médico.

