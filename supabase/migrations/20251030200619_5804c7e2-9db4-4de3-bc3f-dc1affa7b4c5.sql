-- Relax RLS to allow development fallback when no roles configured
DROP POLICY IF EXISTS "Allow same estabelecimento to manage whatsapp_sessions" ON public.whatsapp_sessions;

CREATE POLICY "Manage whatsapp_sessions (same estab/admin or dev)"
ON public.whatsapp_sessions
FOR ALL
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
)
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);