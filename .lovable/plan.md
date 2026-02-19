

## Corrigir Impressao FC Direto: ROTUTX nao e PPLA Raw

### Causa Raiz

O ROTUTX armazenado no banco (tabela FC12300) **nao contem comandos PPLA prontos** para a impressora. Ele contem o **formato interno do Formula Certa** (linhas de texto com metadados de posicao). O formato detectado pelo servidor e "DESCONHECIDO" justamente por isso.

O endpoint atual (`/api/imprimir_fc`) pega esses bytes e envia diretamente para a impressora como RAW. A impressora recebe texto que nao sao comandos PPLA validos, pisca (sinal recebido), mas nao imprime nada porque nao consegue interpretar.

### Solucao

Ja existe um endpoint V2 no servidor (`/api/imprimir-fc-v2`) que faz o trabalho correto:
1. Le o ROTUTX do banco
2. Faz parse do formato interno do Formula Certa (extrai as linhas de texto)
3. Envia as linhas para o agente no endpoint `/imprimir-rotutx`
4. O agente converte as linhas de texto em comandos PPLA validos e imprime

A mudanca e simples: fazer o frontend chamar `/api/imprimir-fc-v2` em vez de `/api/imprimir_fc`.

Alem disso, o endpoint `/imprimir-rotutx` do agente atualmente usa modo `mm` (que ja causou problemas antes). Vamos atualizar para usar o modo `dots` quando configurado na calibracao.

### Mudancas

**1. `src/services/printAgentService.ts`**

Na funcao `imprimirViaRotutx`, trocar a URL de `/api/imprimir_fc` para `/api/imprimir-fc-v2`. Tambem passar a calibracao no payload para que o agente possa usar modo dots.

**2. `src/pages/Index.tsx`**

Passar a calibracao do agente no payload da chamada `imprimirViaRotutx` para que o agente use o modo correto (dots).

**3. `agente_impressao.py`**

Atualizar o endpoint `/imprimir-rotutx` para:
- Aceitar parametro `calibracao` com campo `modo`
- Usar `_ppla_text` e `_build_label` em vez de `ppla_text_mm` e `ppla_full_label` (para suportar modo dots)

### Fluxo Corrigido

```text
Frontend chama servidor: POST /api/imprimir-fc-v2
        |
        v
Servidor le ROTUTX (formato interno FC)
        |
        v
Servidor faz parse -> extrai linhas de texto
        |
        v
Servidor envia linhas para agente: POST /imprimir-rotutx
        |
        v
Agente converte linhas em comandos PPLA (modo dots)
        |
        v
Agente envia PPLA para impressora
        |
        v
Etiqueta imprime com layout correto
```

