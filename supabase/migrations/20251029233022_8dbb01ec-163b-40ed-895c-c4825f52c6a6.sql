-- Ensure RLS is enabled
ALTER TABLE public.form_field_configs ENABLE ROW LEVEL SECURITY;

-- Update policies to allow admin email bypass similar to other tables
DROP POLICY IF EXISTS "Users can manage configs from their estabelecimento" ON public.form_field_configs;
CREATE POLICY "Users can manage configs from their estabelecimento"
ON public.form_field_configs
AS RESTRICTIVE
FOR ALL
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid())
  OR (current_setting('request.jwt.claim.email', true) ILIKE 'admin_%@sistema.local')
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid())
  OR (current_setting('request.jwt.claim.email', true) ILIKE 'admin_%@sistema.local')
);

DROP POLICY IF EXISTS "Users can view configs from their estabelecimento" ON public.form_field_configs;
CREATE POLICY "Users can view configs from their estabelecimento"
ON public.form_field_configs
AS RESTRICTIVE
FOR SELECT
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM public.administradores WHERE administradores.id = auth.uid())
  OR (current_setting('request.jwt.claim.email', true) ILIKE 'admin_%@sistema.local')
);