
# Plano: Sistema de Login + Configuração dos Layouts

## Parte 1: Sistema de Autenticação com Supabase

### Resumo
Criar um sistema de login simples com dois tipos de usuário:
- **rótulos@propharmacos.com** - Operador (só pode buscar requisições e imprimir)
- **Admrótulos@propharmacos.com** - Administrador (acesso total, incluindo configurações)

### Componentes a Criar

1. **Configurar Supabase Cloud** no projeto
2. **Criar tabela de roles** para controlar permissões
3. **Página de Login** (`/login`)
4. **Contexto de Autenticação** para gerenciar estado do usuário
5. **Proteção de Rotas** - redirecionar para login se não autenticado
6. **Ocultar botão de configurações** para usuário operador

### Fluxo de Autenticação

```text
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE LOGIN                           │
├─────────────────────────────────────────────────────────────┤
│  Usuário acessa /                                           │
│      │                                                      │
│      ▼                                                      │
│  Está autenticado?                                          │
│      │                                                      │
│  ┌───┴───┐                                                  │
│  │  NÃO  │─────────► Redireciona para /login                │
│  └───────┘                                                  │
│      │                                                      │
│  ┌───┴───┐                                                  │
│  │  SIM  │─────────► Carrega página principal               │
│  └───────┘               │                                  │
│                          ▼                                  │
│                    É admin?                                 │
│                    ┌───┴───┐                                │
│                    │  SIM  │──► Mostra engrenagem           │
│                    └───────┘                                │
│                    ┌───┴───┐                                │
│                    │  NÃO  │──► Oculta engrenagem           │
│                    └───────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Login.tsx` | Criar página de login |
| `src/contexts/AuthContext.tsx` | Criar contexto de autenticação |
| `src/hooks/useAuth.ts` | Criar hook para uso do contexto |
| `src/App.tsx` | Adicionar rota /login e proteção |
| `src/pages/Index.tsx` | Ocultar engrenagem para não-admin |
| `src/pages/Settings.tsx` | Verificar se é admin |

---

## Parte 2: Configuração dos Layouts Baseado na Imagem

### Análise da Imagem de Referência

Identifiquei **5 layouts** na imagem (atualmente só existem 4):

#### 1. AMP CAIXA (AMP_CX)
```text
Linha 1: PACIENTE                         REQ:XXXXXX-X
Linha 2: DR(A)NOME DO MÉDICO CONSELHO-UF-NÚMERO
Linha 3: NOME DO ATIVO (Composição ou Fórmula)
Linha 4: pH:X,X L:XXX/XX F:XX/XX V:XX/XX
Linha 5: USO EM CONSULTORIO    APLICAÇÃO:XX
Linha 6: CONTEM:XXXXX
Linha 7: REG:XXXXX
```

#### 2. AMP 10 (AMP10)
```text
Linha 1: PACIENTE                         REQ:XXXXXX-X
Linha 2: DR(A)NOME DO MÉDICO CONSELHO-UF-NÚMERO
Linha 3: ATIVO 1 (primeira linha de composição)
Linha 4: ATIVO 2, ATIVO 3, etc. (continuação)
Linha 5: AC. HIALURONICO, etc.    REG:XXXXX
Linha 6: pH:X,X L:XXX/XX V:XX/XX   AP:XX SUPERFICIAL
Linha 7: USO EM CONSULTORIO/ SERINGAS DE XML E XFR DE XML
```

#### 3. A.PAC.PEQ (NOVO - Ampola Pacote Pequeno)
```text
Linha 1: PACIENTE                         REQ:XXXXXX-X
Linha 2: DR(A)NOME CONSELHO-UF-NÚMERO
Linha 3: REG:XXXXX
```
Layout mínimo - apenas 3 linhas essenciais.

#### 4. A.PAC.GRAN (A_PAC_GRAN)
```text
Linha 1: PACIENTE                         REQ:XXXXXX-X
Linha 2: DR(A)NOME CONSELHO-UF-NÚMERO    REG:XXXXX
```
Layout compacto - 2 linhas, registro junto ao médico.

#### 5. TIRZEPATIDA (TIRZ)
```text
Linha 1: PACIENTE                         REQ:XXXXXX-X
Linha 2: DR(A)NOME DO MÉDICO CRM-UF-NÚMERO
Linha 3: TIRZEPATIDA XXmg/X,XML
Linha 4: APLICAR XMG POR SEMANA
Linha 5: pH:X,X L:XXX/XX F:XX/XX V:XX/XX
Linha 6: USO EM CONSULTÓRIO    APLICAÇÃO:SC
Linha 7: CONTEM:XFR. DE X,XML    REG:XXXXX
```

### Alterações nos Layouts

| Layout | Status | Mudanças |
|--------|--------|----------|
| AMP_CX | Ajustar | Reordenar linhas conforme imagem |
| AMP10 | Ajustar | Registro na linha 5 junto com composição |
| A_PAC_PEQ | **CRIAR** | Novo layout mínimo (3 linhas) |
| A_PAC_GRAN | Ajustar | Registro junto ao médico na linha 2 |
| TIRZ | Ajustar | Posologia abaixo da fórmula, contém + registro juntos |

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/types/requisicao.ts` | Adicionar 'A_PAC_PEQ' ao tipo LayoutType |
| `src/config/layouts.ts` | Criar layout A_PAC_PEQ e ajustar os outros 4 |
| `src/components/LayoutSelector.tsx` | Adicionar opção A.PAC.PEQ no dropdown |

---

## Detalhes Técnicos

### Banco de Dados Supabase

```sql
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

-- Tabela de roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'operador',
    UNIQUE (user_id, role)
);

-- RLS habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Configuração dos Layouts (resumo)

```typescript
// Novo tipo com A_PAC_PEQ
export type LayoutType = 'AMP10' | 'AMP_CX' | 'A_PAC_GRAN' | 'A_PAC_PEQ' | 'TIRZ';

// Novo layout A_PAC_PEQ
A_PAC_PEQ: {
  tipo: 'A_PAC_PEQ',
  nome: 'Ampola Pacote Pequeno',
  linhas: [
    { id: 'linha1', campos: ['paciente', 'requisicao'], spacing: 'normal' },
    { id: 'linha2', campos: ['medico'], spacing: 'normal' },
    { id: 'linha3', campos: ['registro'], spacing: 'normal' },
  ],
  // ... campoConfig
}
```

---

## Ordem de Implementação

1. **Habilitar Supabase Cloud** no projeto
2. Criar tabela `user_roles` e função `has_role`
3. Criar página de Login
4. Criar contexto de autenticação
5. Proteger rotas e ocultar engrenagem para operador
6. Atualizar tipos e layouts
7. Testar fluxo completo

---

## Após Aprovação

1. Você verá um botão para habilitar o Supabase Cloud
2. Criarei as migrações do banco de dados
3. Criarei os componentes de autenticação
4. Ajustarei os layouts conforme a imagem
5. Você poderá criar os dois usuários no painel do Supabase:
   - rótulos@propharmacos.com (role: operador)
   - Admrótulos@propharmacos.com (role: admin)
