
-- Atualizar política de INSERT para permitir bootstrap (criar primeiro admin)
DROP POLICY IF EXISTS "Admins and system admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles or bootstrap"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
);
