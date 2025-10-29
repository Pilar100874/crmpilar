-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can manage configs from their estabelecimento" ON public.form_field_configs;
DROP POLICY IF EXISTS "Users can view configs from their estabelecimento" ON public.form_field_configs;

-- Create new permissive policies that allow admin email bypass
CREATE POLICY "Allow admin email to manage configs"
ON public.form_field_configs
FOR ALL
USING (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
)
WITH CHECK (
  (auth.jwt() ->> 'email'::text) ILIKE 'admin_%@sistema.local'
);

CREATE POLICY "Allow admins table to manage configs"
ON public.form_field_configs
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid())
);

CREATE POLICY "Allow users from same estabelecimento to manage configs"
ON public.form_field_configs
FOR ALL
USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT public.roles_present()
  )
)
WITH CHECK (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT public.roles_present()
  )
);