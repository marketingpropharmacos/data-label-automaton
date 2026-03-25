

## Plano: Corrigir fluxo de impressão para usar estação ativa

### Problema
Quando você manda imprimir, o `executePrint` e `handlePrintFcRaw` usam `getPrintAgentConfig()` para obter `agentUrl` e `impressora`. Isso ignora completamente a estação ativa (que foi auto-selecionada ao trocar o layout). Resultado: a impressão vai para o agente errado com a impressora errada.

### Correção em `src/pages/Index.tsx`

**`executePrint` (linhas 165-229)**:
- Trocar `agentConfig.agentUrl` por `getActiveStation()?.agentUrl`
- Trocar fallback `agentConfigComDef.impressora` por `getLayoutPrinter(layoutType)`
- Passar a `agentUrl` correta para `imprimirViaRotutx` e `imprimirViaAgente`

**`handlePrintFcRaw` (linhas 247-290)**:
- Trocar `agentConfig.agentUrl` por `getActiveStation()?.agentUrl`
- Trocar `agentConfig.impressora` por `getLayoutPrinter(layoutType)`

**Inicialização (useEffect linha 56)**:
- Trocar `agentConfig.impressora` por `getLayoutPrinter(layoutType)` para que a impressora correta apareça desde o início

### Resumo

```text
ANTES:  agentUrl  = getPrintAgentConfig().agentUrl  (fixo, global, antigo)
        impressora = agentConfig.impressora          (campo legado)

DEPOIS: agentUrl  = getActiveStation().agentUrl      (varia por layout→estação)
        impressora = selectedPrinter || getLayoutPrinter(layoutType)
```

### Arquivo alterado
- `src/pages/Index.tsx`

