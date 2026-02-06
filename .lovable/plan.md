
# Plano: Ajustes de Exibição e Correções Pontuais

## Análise dos Prints de Referência

### Print 289 - Layouts de Referência
Mostra os padrões de exibição para diferentes layouts:
- **AMP CAIXA**: Paciente, Prescritor, REQ, Fórmula, pH, Lote, F, V, Tipo Uso, Aplicação, Contém, REG
- **AMP 10**: Com posologia/uso ("USO EM CONSULTÓRIO/ 2 SERINGAS DE 1ML E 2FR DE 2ML")
- **TIRZEPATIDA**: Com posologia "APLICAR 5MG POR SEMANA"

### Print 290 - Problema do KIT barra 2
- **Esquerda (REQ:6806-2)**: "KIT POLIREVIT. DESPIGMENT" - NÃO está expandindo componentes!
- **Direita (REQ:6806-3)**: Lista componentes corretamente (AC GLICOLICO, LIDOCAINA, etc.)

### Print 291 - Problema do SUBTÍTULO
- Mostra "ALOPECIA - NUTRIÇÃO E ESTÍMULO DE CRESCIMENTO" aparecendo indevidamente
- Esse é um título de categoria da OBS FICHA, não um ativo!

---

## Alterações Planejadas

### 1. Card Compacto/Expandido (Frontend)
**Arquivo**: `src/components/LabelCard.tsx`

Adicionar dois estados de visualização:

**Estado A (compacto - não selecionado)**:
```
LENIE ANTONIA ALVES DE SOUZA  REQ:6806-0
DR. LENIE ANTONIA ALVES DE SOUZA - COREN 826211/SP
CROMO 20MCG, COBRE 20MCG, VIT B2 10MCG...
APLICAÇÃO: ID
REG: 15079
```

**Estado B (expandido - selecionado)**:
Exibe TODOS os campos conforme layout atual

### 2. Posologia - Voltar a Exibir
**Arquivo**: `src/config/layouts.ts`

- Layout **AMP10**: `posologia.visible = true`, adicionar linha
- Layout **AMP_CX**: `posologia.visible = true`, adicionar linha 
- Layout **TIRZ**: já tem posologia visível

### 3. Filtro de Subtítulo da OBS FICHA
**Arquivo**: `servidor.py` (linha ~3274)

Criar função `is_subtitulo_obs_ficha()` para filtrar:
- "ALOPECIA - NUTRIÇÃO E ESTÍMULO DE CRESCIMENTO"
- "SKIN CARE - HIDRATAÇÃO"
- Formato: `TITULO - SUBTITULO` (só letras, sem dosagem)

**Lógica**:
```python
def is_subtitulo_obs_ficha(linha: str) -> bool:
    """
    Detecta se a linha é um subtítulo/categoria da OBS FICHA.
    Formato típico: "TITULO - SUBTITULO" (sem MG, ML, %)
    """
    if not linha or not linha.strip():
        return False
    
    linha_upper = linha.strip().upper()
    
    # Padrão: TITULO - SUBTITULO sem dosagem
    if ' - ' in linha_upper:
        indicadores = ['MG', 'MCG', 'ML', 'UI', 'IU', '%', 'G/ML', 'MG/ML']
        if not any(ind in linha_upper for ind in indicadores):
            import re
            # Só letras, espaços, acentos e hífen = provavelmente título
            if re.match(r'^[A-ZÇÃÕÉÊÍÓÔÚÀ\s-]+$', linha_upper):
                return True
    
    return False
```

Aplicar **antes** de `ativos_mescla.append()` na linha ~3274.

### 4. Normalizar Barra da REQ
**Arquivo**: `src/components/LabelCard.tsx`

Criar função:
```typescript
const normalizeReqBarra = (nrReq: string, nrItem: string): string => {
  const req = (nrReq || "").trim();
  const barra = (nrItem || "0").trim();
  return `REQ:${req}-${barra}`;
};
```

### 5. KIT Barra 2 (REQ:6806-2) - Debug Específico
**Arquivo**: `servidor.py`

O problema do **KIT POLIREVIT. DESPIGMENT** não expandir pode ser:
1. O nome NÃO contém exatamente "KIT" (contém "KIT" mas algo está falhando)
2. O SERIER não está correto na busca

Verificar se o nome `"KIT POLIREVIT. DESPIGMENT"` passa o filtro `if "KIT" not in descrfrm_upper`.

**Possível correção**: O nome contém "KIT", mas o problema pode ser que `descrfrm` está vindo diferente da FC05000. Vou adicionar log adicional e verificar a lógica.

---

## Ordem de Campos nos Layouts de Referência

### Layout AMP CAIXA (print 289 - linha 1)
```
CAROLINA OLIVEIRA MOURA       REQ:006827-0
DR(A)CAROLINA OLIVEIRA MOURA  CRBM-SP-43603
VITAMINA D 600.000UI/ML
pH:5,0  L:289/25  F:11/25  V:11/26
USO EM CONSULTÓRIO      APLICAÇÃO:IM
CONTÉM:10FR. DE 1ML     REG:15136
```

### Layout AMP 10 (print 289 - linha 2) - com Mescla
```
AMPARITO DEL ROCIO V.CASTRO       REQ:006788-0
DR(A)AMPARITO DEL ROCIO V.CASTRO  COREN-SP-38554
HIDROXIAPATITA DE CALCIO NANOESFERAS 15%
pH:7,0  L:12042/26  F:01/26  V:01/27
COENZIMA Q10 0,5%, SILICIO ORG. 0,5%,
AC. HIALURONICO N RETIC.0,2%  REG:15010
pH:7,0  L:333/25  F:11/25  V:11/26  AP:SC SUPERFICIAL
USO EM CONSULTÓRIO/ 2 SERINGAS DE 1ML E 2FR DE 2ML  ← POSOLOGIA
```

---

## Seção Técnica - Alterações por Arquivo

### `servidor.py`
| Linha | Alteração |
|-------|-----------|
| ~137 | Adicionar função `is_subtitulo_obs_ficha()` |
| ~3274 | Chamar filtro antes de `ativos_mescla.append()` |

### `src/components/LabelCard.tsx`
| Alteração | Descrição |
|-----------|-----------|
| Adicionar `renderCompactContent()` | Renderização para estado não-selecionado |
| Modificar `renderLabelContent()` | Usar compacto quando `!selected` |
| Adicionar `normalizeReqBarra()` | Função para formatar REQ:XXXXX-N |
| Linha 332 e 410 | Usar `normalizeReqBarra()` |

### `src/config/layouts.ts`
| Layout | Alteração |
|--------|-----------|
| AMP10 | `posologia.visible = true`, adicionar na estrutura de linhas |
| AMP_CX | `posologia.visible = true`, adicionar linha 5b |

---

## Casos de Teste

### 1. Item Único (ex: GLICOSE 75%)
**Esperado**:
- Card compacto: Paciente, Prescritor, REQ, nome do produto, Aplicação, REG
- Card expandido: Todos os campos, pH editável
- **NÃO deve mostrar**: água, ampola, selo, tampa

### 2. Mescla (ex: CAF/CARN, requisição 6806-0)
**Esperado**:
- Ativos listados (CROMO, COBRE, VIT B2, etc.)
- **NÃO deve mostrar**: "ALOPECIA - NUTRIÇÃO E ESTÍMULO DE CRESCIMENTO"
- Posologia/Uso quando existir
- pH editável

### 3. KIT (ex: requisição 6806-2 e 6806-3)
**Esperado**:
- **6806-2 (KIT POLIREVIT)**: Deve expandir componentes como 6806-3
- **6806-3**: Já funciona - lista AC GLICOLICO, LIDOCAINA, etc.

---

## Fluxo Visual

```
┌─────────────────────────────────────────────────────────────┐
│  Usuário busca requisição                                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Card NÃO selecionado (compacto):                      │ │
│  │ LENIE ANTONIA ALVES  REQ:6806-0                       │ │
│  │ DR. LENIE ANTONIA - COREN 826211/SP                   │ │
│  │ CROMO 20MCG, COBRE 20MCG, VIT B2...                   │ │
│  │ APLICAÇÃO: ID   REG: 15079                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                   │
│                    clica/seleciona                           │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Card SELECIONADO (expandido):                         │ │
│  │ [Pró Pharmacos - Header completo]                     │ │
│  │ LENIE ANTONIA ALVES DE SOUZA  REQ:6806-0              │ │
│  │ DR. LENIE ANTONIA ALVES DE SOUZA - COREN 826211/SP    │ │
│  │ CROMO 20MCG, COBRE 20MCG, VIT B2 10MCG, METIONINA 5MG │ │
│  │ TAURINA 10MG, PROLINA 1MG, VIT B6 100MCG, S. ZINCO... │ │
│  │ pH: L: 536/26 F: 02/26 V: 08/26                       │ │
│  │ APLICAÇÃO: ID                                          │ │
│  │ CONTÉM:                                                │ │
│  │ REG: 15079                                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ✗ NÃO aparece: "ALOPECIA - NUTRIÇÃO E ESTÍMULO..."        │
└─────────────────────────────────────────────────────────────┘
```

---

## Garantias

1. **Lógica existente NÃO alterada** - Apenas filtros e UI
2. **KITs verdadeiros continuam funcionando** - Só debug do caso 6806-2
3. **Mesclas não afetadas** - Apenas filtro de subtítulos
4. **pH sempre visível** - Já implementado
5. **Posologia volta a aparecer** - Alteração em layouts.ts
