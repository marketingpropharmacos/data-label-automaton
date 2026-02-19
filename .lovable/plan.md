

## Corrigir 38 Etiquetas em Branco e Layout Errado no FC Direto

### Causa Raiz (2 bugs)

**Bug 1: Servidor nao repassa calibracao ao agente**

O `servidor.py` no endpoint `/api/imprimir-fc-v2` (linha 4788) monta o payload para o agente assim:

```text
payload = { impressora, linhas, req }  -- SEM calibracao!
```

O frontend envia a calibracao (fonte, rotacao, contraste, modo), mas o servidor ignora e nao repassa. O agente usa defaults.

**Bug 2: Setup dots sem comando de quantidade Q0001**

A funcao `ppla_setup_dots` no `agente_impressao.py` (linha 182) envia apenas:
- STX L (modo formatacao)
- D11 (pixel size)
- H14 (contraste)

Sem o comando `Q0001`, a impressora usa o valor que estiver na memoria interna -- que pode ser 38, 50 ou qualquer numero. Isso causa as 38 etiquetas em branco.

### Mudancas

**1. `servidor.py` - Repassar calibracao para o agente**

No endpoint `/api/imprimir-fc-v2`, adicionar o campo `calibracao` ao payload enviado ao agente. O frontend ja envia esse dado no body.

Antes:
```python
payload_agente = {
    "impressora": impressora,
    "linhas": [l['text'] for l in linhas_parsed],
    "req": str(nr_requisicao)
}
```

Depois:
```python
payload_agente = {
    "impressora": impressora,
    "linhas": [l['text'] for l in linhas_parsed],
    "req": str(nr_requisicao),
    "calibracao": data.get("calibracao", {})
}
```

**2. `agente_impressao.py` - Adicionar Q0001 ao setup dots**

Na funcao `ppla_setup_dots`, adicionar o comando `Q0001` para forcar 1 copia por label. Este era o comando que foi removido antes para tentar resolver outro problema, mas sem ele a impressora imprime quantidades aleatorias.

Antes:
```python
partes = [
    f"\x02L",
    f"D11",
    f"H{contraste:02d}",
]
```

Depois:
```python
partes = [
    f"\x02L",
    f"D11",
    f"H{contraste:02d}",
    f"Q0001",
]
```

**3. `agente_impressao.py` - Reduzir fonte padrao para menor**

O usuario pediu fonte menor. Alterar o default de `font=2` para `font=0` (a menor disponivel, 6x10 dots) no endpoint `/imprimir-rotutx`, para que o texto caiba melhor na etiqueta pequena.

### Resultado Esperado

- Apenas 1 etiqueta sai por impressao (Q0001 garante isso)
- A calibracao do frontend (fonte, rotacao, contraste) chega ao agente
- Fonte menor = texto cabe inteiro na etiqueta
- Layout consistente com o que o Formula Certa gera

