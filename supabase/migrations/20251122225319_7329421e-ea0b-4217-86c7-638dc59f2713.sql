-- Remover TODAS as políticas antigas conflitantes de estabelecimentos
DROP POLICY IF EXISTS "Anyone can view estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Users can view estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Admins can delete estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Admins can update estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Admins have full access to estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Administradores podem ver todos estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Administradores podem editar todos estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Administradores podem criar estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Usuarios admin veem seu estabelecimento" ON public.estabelecimentos;

-- As únicas políticas que devem existir são:
-- 1. SELECT: Usuários veem apenas seu estabelecimento OU administradores veem todos
-- 2. INSERT: Apenas administradores do sistema
-- 3. UPDATE: Apenas administradores do sistema
-- 4. DELETE: Apenas administradores do sistema

-- Estas já existem das migrações anteriores:
-- - "Usuarios veem seu estabelecimento"
-- - "Apenas administradores criam estabelecimentos"
-- - "Apenas administradores modificam estabelecimentos"
-- - "Apenas administradores excluem estabelecimentos"