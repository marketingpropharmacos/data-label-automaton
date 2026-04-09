
## Diagnóstico

O problema agora não parece ser mais “o layout” do A.PAC.PEQ em si.

Pelo código atual:
- o frontend já limita o **paciente** a 20 caracteres antes da `REQ`
- o agente já imprime o **paciente** com `MAX_PAT_CHARS = 20`
- o `cols_max` do A.PAC.PEQ já está em **41**

Então, se ainda está saindo “um em cima do outro”, a causa mais provável é outra:

1. O sistema está **restaurando `textoLivre` salvo** da requisição no Supabase
2. Esse `textoLivre` pode ter sido salvo **antes da correção**, com o nome inteiro invadindo a área da `REQ`
3. Na impressão, o agente usa esse `textoLivre` já salvo e **não regenera automaticamente** o texto corrigido

Ou seja: a correção existe, mas o rótulo antigo salvo continua sendo reimpresso.

## O que ajustar

### 1. Forçar regeneração do `textoLivre` no A.PAC.PEQ quando ele estiver incompatível
No carregamento da requisição (`src/pages/Index.tsx`), além da checagem por largura da linha, validar também:
- se a linha 1 com `REQ:` tem texto à esquerda maior que o limite físico
- se a linha 2 do médico ultrapassa a área segura
- se estiver incompatível, **ignorar o texto salvo** e regenerar com a lógica nova

### 2. Adicionar uma normalização específica do A.PAC.PEQ
Em `src/components/LabelTextEditor.tsx`, criar uma rotina para:
- reprocessar linha 1 como `PACIENTE + REQ`
- reprocessar linha 2 como `DR(A)+MÉDICO + CONSELHO`
- manter linha 3 com `REG`
- aplicar sempre o limite físico real antes de salvar/imprimir

Isso garante que, mesmo se houver texto antigo ou editado manualmente, o conteúdo volte para a faixa correta sem mudar o layout.

### 3. Proteger a impressão no agente
Em `agente_impressao.py`, no modo `textoLivre` do A.PAC.PEQ:
- além do limite atual do paciente, reforçar a separação entre campo esquerdo e `REQ`
- se a linha chegar com sobra de texto na área proibida, o agente deve recortar apenas a parte esquerda e preservar a `REQ` intacta

Assim o agente vira a última barreira de segurança.

## Resultado esperado

Sem mexer no layout:
- paciente não invade mais a `REQ`
- médico continua usando a largura disponível
- textos antigos salvos não reaparecem quebrados
- impressão fica consistente com o preview

## Arquivos envolvidos

- `src/pages/Index.tsx`
- `src/components/LabelTextEditor.tsx`
- `agente_impressao.py`

## Detalhe técnico

Hoje a restauração usa este critério:
- se o `texto_livre` salvo tiver largura parecida com a do layout atual, ele é reaproveitado

Isso é insuficiente para o A.PAC.PEQ, porque um texto pode ter “41 colunas” e ainda assim estar fisicamente errado, já que:
- a etiqueta total suporta 41 colunas
- mas o espaço do **paciente antes da REQ** suporta só ~20 caracteres

Então a próxima implementação deve validar **zona física por campo**, não só largura total da linha.
