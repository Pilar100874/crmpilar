-- Criar função has_role com SECURITY DEFINER para evitar recursão em RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recriar políticas de user_roles para permitir operações
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Permitir SELECT para usuários autenticados
CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Permitir INSERT/UPDATE/DELETE para admins e gestores
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
);

-- Atualizar políticas de tabelas principais para dar acesso total aos admins

-- Atualizar usuarios
DROP POLICY IF EXISTS "Allow authenticated users to read" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.usuarios;
DROP POLICY IF EXISTS "Allow authenticated users to delete" ON public.usuarios;

CREATE POLICY "Admins have full access to usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view usuarios in their estabelecimento"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Gestores can manage usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'gestor'::app_role)
  AND estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

-- Atualizar atendentes
DROP POLICY IF EXISTS "Authenticated users can read atendentes" ON public.atendentes;
DROP POLICY IF EXISTS "Admins and gestores can manage atendentes" ON public.atendentes;

CREATE POLICY "Admins have full access to atendentes"
ON public.atendentes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view atendentes"
ON public.atendentes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestores can manage atendentes"
ON public.atendentes
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'gestor'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'gestor'::app_role)
);

-- Atualizar estabelecimentos
DROP POLICY IF EXISTS "Allow authenticated to read estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Allow authenticated to insert estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Allow authenticated to update estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Allow authenticated to delete estabelecimentos" ON public.estabelecimentos;

CREATE POLICY "Admins have full access to estabelecimentos"
ON public.estabelecimentos
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view estabelecimentos"
ON public.estabelecimentos
FOR SELECT
TO authenticated
USING (true);

-- Atualizar customers
DROP POLICY IF EXISTS "Allow authenticated to read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated to delete customers" ON public.customers;

CREATE POLICY "Admins have full access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

-- Atualizar empresas
DROP POLICY IF EXISTS "Allow authenticated to read empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow authenticated to insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow authenticated to update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Allow authenticated to delete empresas" ON public.empresas;

CREATE POLICY "Admins have full access to empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

-- Atualizar conversations
DROP POLICY IF EXISTS "Allow authenticated to read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated to insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated to update conversations" ON public.conversations;

CREATE POLICY "Admins have full access to conversations"
ON public.conversations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage conversations"
ON public.conversations
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);