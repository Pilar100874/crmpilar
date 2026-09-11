DROP POLICY IF EXISTS "Usuarios autenticados leem config de push" ON public.port_push_config;
DROP POLICY IF EXISTS "Usuarios autenticados gerenciam config de push" ON public.port_push_config;
REVOKE ALL ON public.port_push_config FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_push_config TO authenticated;
GRANT ALL ON public.port_push_config TO service_role;
CREATE POLICY "Somente administradores gerenciam config de push"
ON public.port_push_config
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()));