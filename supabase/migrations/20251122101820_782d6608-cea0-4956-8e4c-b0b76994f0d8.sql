-- Ajustar políticas de RLS na tabela user_roles para permitir que registros na tabela administradores gerenciem roles

-- Remover políticas existentes
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recriar política de INSERT permitindo:
-- 1) Usuário que já tem role admin via has_role
-- 2) Usuário presente na tabela administradores
-- 3) Cenário inicial sem roles (roles_present() = false)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
  OR NOT roles_present()
);

-- Política de UPDATE com os mesmos critérios
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
);

-- Política de DELETE com os mesmos critérios
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
);