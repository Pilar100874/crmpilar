-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their establishment config" ON public.logistica_config;
DROP POLICY IF EXISTS "Users can insert their establishment config" ON public.logistica_config;
DROP POLICY IF EXISTS "Users can update their establishment config" ON public.logistica_config;

-- Create improved policies that work for both regular users and system admins
CREATE POLICY "Users can view logistica config"
ON public.logistica_config FOR SELECT
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

CREATE POLICY "Users can insert logistica config"
ON public.logistica_config FOR INSERT
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

CREATE POLICY "Users can update logistica config"
ON public.logistica_config FOR UPDATE
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR ((auth.jwt() ->> 'email'::text) ~~* 'admin_%@sistema.local'::text)
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);