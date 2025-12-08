-- The issue is that after INSERT, the .select() fails because the new conversation 
-- doesn't have participants yet (they are added after)
-- We need to allow SELECT for conversations in the same estabelecimento as the user

DROP POLICY IF EXISTS "conversas_select" ON public.chat_interno_conversas;

CREATE POLICY "conversas_select" ON public.chat_interno_conversas
  FOR SELECT TO authenticated
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );