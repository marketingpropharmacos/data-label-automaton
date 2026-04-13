

# Corrigir sincronização do "Salvar" entre PCs (Daniel/Edi)

## Problema identificado

O salvamento no Supabase funciona corretamente (a gravação via `upsert` está OK e as políticas RLS permitem leitura/escrita para qualquer usuário autenticado). O problema é que **ao carregar**, a função `isAmp10SavedTextValid` descarta o texto salvo porque a validação é extremamente rígida — ela exige tokens exatos como `REQ:`, `DR(A)`, `USO`, `CONTEM:`, `AP:`, `REG:` nas posições corretas.

Quando o operador faz edições manuais (WYSIWYG), o texto editado pode não passar mais nessa validação, e o sistema regenera o texto do zero — dando a impressão de que "não salvou".

Esse problema ocorre em **dois lugares**:
1. **`src/pages/Index.tsx`** (linha 202): ao buscar uma requisição, descarta texto salvo que falha na validação
2. **`src/components/LabelTextEditor.tsx`** (linha 1013): ao trocar de layout, descarta texto editado que falha na validação

## Solução

Para o layout **AMP10**, remover a validação restritiva `isAmp10SavedTextValid` na **restauração de texto salvo**. Se existe texto salvo no Supabase para aquele item, ele deve ser restaurado tal como foi salvo — o operador é quem decide o conteúdo.

### Alterações

1. **`src/pages/Index.tsx`** — Remover a checagem `isAmp10SavedTextValid` no bloco de restauração (linhas 202-204). Texto salvo para AMP10 será restaurado sempre.

2. **`src/components/LabelTextEditor.tsx`** — Relaxar ou remover a checagem `isAmp10SavedTextValid` na troca de layout (linha 1013) para não sobrescrever edições do usuário.

### O que NÃO será alterado
- Nenhum layout ou coordenada
- A lógica de salvamento (upsert) permanece igual
- A validação para `A_PAC_PEQ` e `A_PAC_GRAN` permanece (esses layouts forçam regeneração por design)

