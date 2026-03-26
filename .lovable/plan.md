

## Plano: Melhorias no editor AMP10 — BLISTER, metadados e espaçamento

### 1. BLISTER FRENTE / BLISTER FUNDO

Esses nomes vêm dos **componentes do kit** (`rotulo.componentes`). O banco de dados retorna itens como "BIS BLISTER FRENTE" e "BIS BLISTER FUNDO" como componentes do kit. A função `formatarNomeComponente` (linha 85) remove apenas o prefixo "BIS " mas mantém "BLISTER FRENTE/FUNDO".

**Solução**: Não filtrar automaticamente — esses são componentes reais do kit vindos do banco. Se não devem aparecer, o ideal é filtrar pelo tipo ou nome. Vou adicionar um filtro que remove componentes cujo nome contenha "BLISTER" (ou outra palavra-chave que você defina).

### 2. Toggle: metadados na mesma linha vs linha abaixo

Atualmente, para kits no AMP10, o código gera:
```text
CLORETO MG 400MG/2ML ENDOV
L:729  F:02/26  V:02/27
```

Com o toggle "mesma linha", ficaria:
```text
CLORETO MG 400MG/2ML ENDOV  L:729  F:02/26  V:02/27
```

**Implementação**: Adicionar um botão/switch no header do editor ("↕ Compacto") que alterna entre os dois modos. O estado é salvo no localStorage por layout. Quando ativo, o `generateTextAmp10` concatena nome + metadados na mesma linha em vez de linhas separadas.

### 3. Controle de espaçamento entre linhas

Adicionar botões no header (junto ao controle de fonte) para ajustar o `line-height` do textarea:
- Mínimo: 1.0 (linhas coladas)
- Padrão: 1.4
- Máximo: 2.0
- Incremento: 0.1

Isso afeta apenas o **preview visual** — a impressão física usa coordenadas Y fixas em dots.

### Alterações

**`src/components/LabelTextEditor.tsx`**:

1. **Filtro BLISTER** (linhas 354-366): No loop de componentes do kit, pular componentes cujo nome (após limpeza) comece com "BLISTER"

2. **Toggle metadados** (linhas 354-366 + header):
   - Novo state `metaInline` (boolean, persistido no localStorage)
   - Quando `true`, concatenar `nomeExibicao + "  " + meta.join("  ")` em uma única linha
   - Quando `false`, manter comportamento atual (2 linhas)
   - Botão no header: ícone de linhas ↕ com tooltip

3. **Controle de line-height** (header + textarea):
   - Novo state `lineSpacing` (number, persistido no localStorage)
   - Botões +/- no header ao lado do controle de fonte
   - Aplicar no `style={{ lineHeight: lineSpacing }}` do textarea

### Arquivos alterados
- `src/components/LabelTextEditor.tsx`

