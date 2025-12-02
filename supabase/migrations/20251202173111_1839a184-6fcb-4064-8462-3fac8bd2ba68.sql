-- Drop all existing policies on chat tables
DROP POLICY IF EXISTS "participantes_select_policy" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_insert_policy" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_delete_policy" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "mensagens_select_policy" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "mensagens_insert_policy" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "conversas_select_policy" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "conversas_insert_policy" ON public.chat_interno_conversas;

-- Drop old helper function if exists
DROP FUNCTION IF EXISTS is_conversation_participant(uuid, uuid);

-- Create simple policies without recursion for chat_interno_participantes
-- SELECT: users can see participants of conversations they are in
CREATE POLICY "chat_participantes_select" ON public.chat_interno_participantes
FOR SELECT TO authenticated
USING (
  usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  OR 
  conversa_id IN (
    SELECT p.conversa_id FROM chat_interno_participantes p 
    WHERE p.usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  )
);

-- INSERT: authenticated users can add participants
CREATE POLICY "chat_participantes_insert" ON public.chat_interno_participantes
FOR INSERT TO authenticated
WITH CHECK (true);

-- DELETE: users can remove themselves
CREATE POLICY "chat_participantes_delete" ON public.chat_interno_participantes
FOR DELETE TO authenticated
USING (usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1));

-- Policies for chat_interno_mensagens
CREATE POLICY "chat_mensagens_select" ON public.chat_interno_mensagens
FOR SELECT TO authenticated
USING (
  conversa_id IN (
    SELECT p.conversa_id FROM chat_interno_participantes p 
    WHERE p.usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "chat_mensagens_insert" ON public.chat_interno_mensagens
FOR INSERT TO authenticated
WITH CHECK (
  conversa_id IN (
    SELECT p.conversa_id FROM chat_interno_participantes p 
    WHERE p.usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  )
);

-- Policies for chat_interno_conversas
CREATE POLICY "chat_conversas_select" ON public.chat_interno_conversas
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT p.conversa_id FROM chat_interno_participantes p 
    WHERE p.usuario_id = (SELECT u.id FROM usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY "chat_conversas_insert" ON public.chat_interno_conversas
FOR INSERT TO authenticated
WITH CHECK (true);