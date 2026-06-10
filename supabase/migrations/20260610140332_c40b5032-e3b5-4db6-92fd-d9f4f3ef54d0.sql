DROP POLICY IF EXISTS "Admins manage administradores" ON public.administradores;
CREATE POLICY "Admins manage administradores" ON public.administradores
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));