# Arquitetura de Administração do Sistema

## Visão Geral

O sistema possui **dois níveis distintos de administração**, cada um com suas próprias responsabilidades e limitações:

## 1. Administrador do Sistema

**Tabela:** `public.administradores`

**Identificação:**
```sql
EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
```

**Permissões:**
- ✅ Acesso total a **todos os estabelecimentos**
- ✅ Criar, editar e excluir estabelecimentos
- ✅ Gerenciar usuários de qualquer estabelecimento
- ✅ Visualizar e modificar todos os dados do sistema
- ✅ Acesso irrestrito a todos os recursos

**Como verificar no código:**
```typescript
import { isSystemAdmin } from '@/lib/estabelecimentoUtils';

const isAdmin = await isSystemAdmin();
```

## 2. Admin de Estabelecimento

**Tabelas:** `public.usuarios` + `public.user_roles`

**Identificação:**
```sql
has_role(auth.uid(), 'admin'::app_role)
```

**Permissões:**
- ✅ Acesso total apenas ao **próprio estabelecimento**
- ✅ Gerenciar usuários do estabelecimento
- ✅ Gerenciar bots, flows, relatórios, skills, etc. do estabelecimento
- ❌ **NÃO pode** modificar dados básicos do estabelecimento (CNPJ, nome, limites)
- ❌ **NÃO pode** criar novos estabelecimentos
- ❌ **NÃO pode** acessar dados de outros estabelecimentos

**Como verificar no código:**
```typescript
import { isEstabelecimentoAdmin } from '@/lib/estabelecimentoUtils';

const isAdmin = await isEstabelecimentoAdmin();
```

## Mapeamento Crítico de IDs

⚠️ **ATENÇÃO:** A tabela `user_roles` tem uma estrutura específica de mapeamento:

```
auth.users.id 
  ↓ (vinculado por)
usuarios.auth_user_id 
  ↓ (gera)
usuarios.id
  ↓ (referenciado por)
user_roles.user_id
```

**Importante:**
- `user_roles.user_id` **referencia** `usuarios.id`
- `user_roles.user_id` **NÃO referencia** `auth.users.id`

### Foreign Key
```sql
-- user_roles.user_id → usuarios.id
FOREIGN KEY (user_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE CASCADE
```

## Funções Utilitárias

### Backend (Supabase Functions)

#### `has_role(_user_id uuid, _role app_role)`
Verifica se um usuário tem uma role específica. Já faz o mapeamento correto entre `auth.users.id` → `usuarios.id`.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.usuarios u ON ur.user_id = u.id
    WHERE u.auth_user_id = _user_id
      AND ur.role = _role
  )
$$;
```

#### `get_user_estabelecimento_id(_user_id uuid)`
Retorna o `estabelecimento_id` do usuário.

### Frontend (TypeScript)

Todas as funções estão em `src/lib/estabelecimentoUtils.ts`:

#### `isSystemAdmin()`
Verifica se o usuário é administrador do sistema.

#### `isEstabelecimentoAdmin()`
Verifica se o usuário tem role 'admin' no estabelecimento.

#### `isAnyAdmin()`
Verifica se o usuário é admin de qualquer tipo (sistema OU estabelecimento).

#### `getUserIdFromAuth()`
Converte `auth.users.id` para `usuarios.id`.

#### `getEstabelecimentoId(estabelecimentoId?)`
Obtém o ID do estabelecimento considerando a hierarquia de prioridades.

## Políticas RLS Padrão

### Padrão para SELECT
```sql
CREATE POLICY "Nome da política"
ON public.tabela
FOR SELECT
TO authenticated
USING (
  -- Administrador do sistema tem acesso total
  EXISTS (
    SELECT 1 FROM public.administradores 
    WHERE id = auth.uid()
  )
  OR
  -- Admin de estabelecimento acessa apenas seu estabelecimento
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
  )
);
```

### Padrão para INSERT/UPDATE/DELETE
Mesma lógica do SELECT, com `WITH CHECK` adicional para UPDATE.

### Exceção: Tabela `estabelecimentos`
```sql
-- Apenas administradores do sistema podem modificar estabelecimentos
CREATE POLICY "Admins modificam estabelecimentos"
ON public.estabelecimentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.administradores 
    WHERE administradores.id = auth.uid()
  )
  OR
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (
      SELECT estabelecimento_id 
      FROM public.usuarios 
      WHERE auth_user_id = auth.uid()
    )
  )
);
```

**Nota:** Admins de estabelecimento podem modificar apenas configurações específicas (como `automacao_vendas_config`), mas não podem alterar CNPJ, nome ou limites de usuários.

## Exemplos de Uso

### Verificando permissões no componente

```typescript
import { isSystemAdmin, isEstabelecimentoAdmin } from '@/lib/estabelecimentoUtils';

const MyComponent = () => {
  const [canEditEstabelecimento, setCanEditEstabelecimento] = useState(false);
  
  useEffect(() => {
    const checkPermissions = async () => {
      // Apenas admin de sistema pode editar dados básicos
      const systemAdmin = await isSystemAdmin();
      setCanEditEstabelecimento(systemAdmin);
    };
    
    checkPermissions();
  }, []);
  
  return (
    <>
      {canEditEstabelecimento && (
        <Button>Editar Estabelecimento</Button>
      )}
    </>
  );
};
```

### Buscando role em user_roles

```typescript
// ❌ ERRADO - usar auth.users.id diretamente
const { data: { user } } = await supabase.auth.getUser();
const { data: role } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id) // ERRADO!
  .maybeSingle();

// ✅ CORRETO - mapear para usuarios.id primeiro
const { data: { user } } = await supabase.auth.getUser();
const { data: userData } = await supabase
  .from('usuarios')
  .select('id')
  .eq('auth_user_id', user.id)
  .maybeSingle();

if (userData) {
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.id) // CORRETO!
    .maybeSingle();
}

// ✅ AINDA MELHOR - usar função helper
import { getUserIdFromAuth } from '@/lib/estabelecimentoUtils';

const usuarioId = await getUserIdFromAuth();
if (usuarioId) {
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', usuarioId)
    .maybeSingle();
}
```

## Troubleshooting

### "Configurações não salvam"
- ✅ Verificar se usuário tem role 'admin' em `user_roles`
- ✅ Confirmar que `user_roles.user_id` aponta para `usuarios.id` correto
- ✅ Verificar políticas RLS da tabela

### "Usuário não vê dados do estabelecimento"
- ✅ Verificar `usuarios.estabelecimento_id`
- ✅ Confirmar políticas RLS com filtro por `estabelecimento_id`

### "Admin de estabelecimento não consegue editar"
- ✅ Verificar se a policy inclui `has_role(auth.uid(), 'admin'::app_role)`
- ✅ Confirmar que a função `has_role()` está funcionando (veja em db-functions)

## Referências

- `src/lib/estabelecimentoUtils.ts` - Funções utilitárias
- `src/lib/adminUtils.ts` - Documentação técnica detalhada
- `src/components/Layout.tsx` - Implementação de verificação de permissões
- `src/components/config/UsuariosCRUD.tsx` - Gerenciamento de roles

## Changelog

### 2025-11-26
- ✅ Corrigida função `has_role()` para mapear corretamente `auth_user_id → usuarios.id`
- ✅ Corrigida função `validate_single_admin_per_estabelecimento()` com JOINs corretos
- ✅ Corrigido `Layout.tsx` para usar `usuarios.id` ao buscar em `user_roles`
- ✅ Adicionadas funções helper em `estabelecimentoUtils.ts`
- ✅ Criada documentação completa em `ADMIN-ARCHITECTURE.md`
