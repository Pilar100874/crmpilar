-- Update SELECT policy for bot_flows to include admin email bypass
DROP POLICY IF EXISTS "View bot flows (same estab or admin)" ON public.bot_flows;

CREATE POLICY "View bot flows (admin email or same estab)"
ON public.bot_flows
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local'
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
);