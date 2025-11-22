-- Remover políticas existentes de INSERT se existirem e recriar
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Permitir que admins possam inserir roles (usando a função has_role para evitar recursão)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR NOT roles_present()
);

-- Remover e recriar política de UPDATE se necessário
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Remover e recriar política de DELETE se necessário
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);