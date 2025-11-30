
-- Remover políticas antigas de user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

-- Criar política para SELECT - todos autenticados podem ver
CREATE POLICY "Authenticated users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Criar política para INSERT - admins ou administradores do sistema podem inserir
CREATE POLICY "Admins and system admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin()
);

-- Criar política para UPDATE - admins ou administradores do sistema podem atualizar
CREATE POLICY "Admins and system admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin()
);

-- Criar política para DELETE - admins ou administradores do sistema podem deletar
CREATE POLICY "Admins and system admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_system_admin()
);
