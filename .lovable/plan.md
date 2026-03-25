

## Plano: Corrigir layout AMP_CX — componentes na mesma linha com pH/L/F/V

### O que está errado hoje

O `gerar_ppla_ampcx` (linhas 395-444) ignora completamente o campo `componentes` (kits). Ele usa apenas `composicao` e quebra em 3 linhas sem pH, Lote, Fabricação ou Validade. Também faltam Aplicação, Contem e REG.

### Layout correto (conforme o print do FC)

```text
Linha 1 (Y=82): PACIENTE                         REQ:008009-1
Linha 2 (Y=73): DR(A)NOME CONSELHO.UF-NUM
Linha 3 (Y=64): CLORETO MG PH:5.5 L:240601 F:06/24 V:12/24
Linha 4 (Y=55): ACIDO TRANEXAMICO PH:6.0 L:240602 F:06/24 V:12/24
Linha 5 (Y=46): USO TOPICO                       APLICACAO:ID/SC
Linha 6 (Y=37): CONTEM: 5 FR                     REG:54321
```

Cada componente do kit ocupa **uma linha** com seus metadados (pH, L, F, V) concatenados.

### Alteração

**`agente_impressao.py`** — Reescrever a seção "Geração estruturada" de `gerar_ppla_ampcx` (linhas 395-444):

1. Extrair `componentes` do payload (como já faz o AMP10)
2. **Se tem componentes (kit)**: cada componente em uma linha com formato `NOME PH:X L:X F:X V:X` (linhas Y=64, 55, até 3 componentes)
3. **Se não tem componentes**: composição em 1 linha + pH/L/F/V na mesma linha
4. Linha de **Uso + Aplicação** (Y=46): `USO` à esquerda, `APLICACAO:XX` à direita
5. Linha de **Contem + REG** (Y=37): `CONTEM: XX` à esquerda, `REG:XXXXX` à direita
6. Usar a mesma lógica de `_compact_line` para posicionar elementos à esquerda/direita

### Arquivo alterado
- `agente_impressao.py` — reescrever linhas 395-444 (~50 linhas)

