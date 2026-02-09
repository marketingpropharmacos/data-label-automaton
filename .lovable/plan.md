

# Correcao do Rotulo KIT - Req 6806-2

## Problema Atual

O rotulo atual mostra:
```
LENIE ANTONIA ALVES DE SOUZA          REQ:6806-2
DR. LENIE ANTONIA ALVES DE SOUZA - COREN 826211/SP
POLIREVITALIZANTE AC HIA 2
L:12012 F:12/25 V:12/26
REVITALIZANTE DESPIGMENT
L:705 F:01/26 V:01/27
REG:15079
```

O correto (referencia FormulaCerta) e:
```
LENIE ANTONIA ALVES DE SOUZA          REQ:006806-2
DR(A) LENIE ANTONIA A.DE SOUZA  COREN-SP-826211
ACIDO HIALURONICO N RETIC. 5MG
pH:6,0  L:12012/25   F:12/25  V:12/26
ACIDO TRANEXAMICO 8MG, TGP2 20MG, BELIDES 2%
LIP. VIT C 10MG, NIACINAMIDA 40MG pH:6,5
L:329/25   F:11/25   V:05/26
USO EM CONSULTORIO  AP:MICROAGULHAMENTO
CONTEM: 4FR. DE 2ML   REG:15081
```

## Diferencas Identificadas

1. **Nomes de componentes em vez de composicao** - Mostra "POLIREVITALIZANTE AC HIA 2" em vez de "ACIDO HIALURONICO N RETIC. 5MG". Isso indica que `eSinonimo` nao esta sendo detectado corretamente, ou que `extrair_composicao_componente` esta retornando vazio para esses produtos.

2. **pH ausente** - Nao aparece "pH:6,0" nem "pH:6,5". A funcao `buscar_ph_componente` pode estar falhando ou o campo esta vazio no banco.

3. **Tipo de Uso ausente** - "USO EM CONSULTORIO" nao aparece. O campo `tipoUso` provavelmente esta vazio ou numerico (filtrado pela validacao).

4. **Aplicacao ausente** - "AP:MICROAGULHAMENTO" nao aparece. O campo `aplicacao` provavelmente esta vazio no rotulo do kit.

5. **CONTEM ausente** - "4FR. DE 2ML" nao aparece. O campo `contem` provavelmente esta vazio.

6. **Formato do lote** - Referencia mostra "L:12012/25" (com /25), codigo atual mostra "L:12012" (sem sufixo).

## Acoes de Diagnostico e Correcao

### 1. Backend - Diagnostico via logs do terminal

Ao buscar req 6806-2, verificar nos logs do `servidor.py`:
- Se `[SINONIMO] Kit sinonimo detectado` aparece (confirma `eSinonimo=true`)
- Se `[COMPOSICAO_COMP] Buscando ativos para CDPRO=X` retorna resultados
- Se `buscar_ph_componente` encontra dados na FC06100

### 2. Backend - Correcao da composicao (`servidor.py`)

Se `extrair_composicao_componente` retorna vazio, pode ser porque:
- O CDPRO do componente na FC05100 nao tem registros na FC03300/FC99999
- Precisa usar CDPRIN do componente em vez de CDPRO direto

**Correcao**: Na funcao `extrair_composicao_componente`, adicionar fallback buscando pelo CDPRIN do componente (via FC03000) se a busca direta por CDPRO retornar vazio.

### 3. Backend - Campos tipoUso, aplicacao, contem no KIT

Verificar se estes campos estao sendo incluidos no rotulo de KIT. Atualmente o `dados_base` do cabecalho da requisicao ja traz `tipoUso`, mas para KITs o campo `aplicacao` e extraido da FC03300 apenas para nao-KITs (linha 3780: `if not e_kit`).

**Correcao**: Garantir que `aplicacao` tambem e extraida para KITs, ou buscar a aplicacao do produto principal do kit.

### 4. Frontend - Sem alteracoes necessarias

A logica de renderizacao em `LabelCard.tsx` ja esta correta (renderKitContent ja suporta pH, tipoUso, aplicacao, contem). O problema e que os dados estao chegando vazios do backend.

## Detalhes Tecnicos

### servidor.py - Alteracao 1: Aplicacao para KITs (linha ~3780)

Remover a condicao `if not e_kit` da busca de aplicacao na FC03300, ou adicionar busca separada de aplicacao para KITs usando o CDPRO original (ou resolvido).

### servidor.py - Alteracao 2: Composicao do componente com fallback CDPRIN

Na funcao `extrair_composicao_componente`, apos falhar com CDPRO direto:
1. Buscar CDPRIN do componente na FC03000
2. Se CDPRIN diferente, repetir busca FC03300/FC99999 com CDPRIN

### servidor.py - Alteracao 3: Campos contem e tipoUso

Verificar se `tipoUso` do cabecalho esta sendo mapeado para o rotulo de KIT (deve ja estar em `dados_base`). O campo `contem` geralmente e manual (editavel pelo usuario), entao pode ficar vazio por padrao.

