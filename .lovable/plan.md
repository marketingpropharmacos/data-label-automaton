

## Diagnóstico

Analisando as duas fotos:

**Foto 1 (problema atual):** A etiqueta A.PAC.GRAN imprime 3+ linhas separadas verticalmente — Paciente, DR(A), REQ, Conselho e REG cada um em sua própria posição Y, criando espaçamento excessivo.

**Foto 2 (resultado desejado):** Apenas **2 linhas**, coladas uma à outra:
- Linha 1: `PACIENTE .......... REQ:XXXXXX-X`
- Linha 2: `DR(A)NOME ......... CONSELHO REG XXXXX`

### Causa raiz

O frontend (`generateTextPacGran`) gera **3 linhas** de textoLivre:
1. Paciente + REQ
2. DR(A) + Conselho
3. REG (linha separada)

O agente recebe 3 linhas e coloca cada uma em um Y diferente (89, 78, 67), criando o espaçamento visual.

Além disso, o parser do agente trata "REG:" como linha exclusiva (branch `elif 'REG:'`), sem conseguir extrair REG quando está na mesma linha do médico/conselho.

---

## Plano de correção

### 1. Frontend — `generateTextPacGran` em `LabelTextEditor.tsx`

Alterar para gerar **apenas 2 linhas**:
- **L1:** Paciente (esquerda) + REQ (direita) — sem mudança
- **L2:** DR(A)+Nome (esquerda) + Conselho + REG (direita) — **juntar conselho e REG na mesma linha**

O REG será concatenado ao conselho na zona direita: `CONSELHO REG:XXXXX`

Remover a linha 3 separada de REG.

### 2. Agente — `gerar_ppla_a_pac_gran` em `agente_impressao.py`

Atualizar o parser de textoLivre para:
- Na **linha 2** (pos_idx=1), detectar tanto conselho quanto REG na mesma string
- Extrair `DR(A)...` para x_med, conselho para x_crm, e `REG:` para x_reg — todos no **mesmo Y**
- Manter a lógica existente da linha 1 (Paciente + REQ) intacta

Também atualizar o bloco de geração estruturada (fallback sem textoLivre) para usar apenas 2 Y-positions, colocando REG na mesma linha Y=78 do médico.

### Arquivos alterados

- `src/components/LabelTextEditor.tsx` — função `generateTextPacGran`
- `agente_impressao.py` — função `gerar_ppla_a_pac_gran`

