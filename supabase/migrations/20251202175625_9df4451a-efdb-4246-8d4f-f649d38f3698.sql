-- Drop ALL existing policies on chat tables to start fresh
DROP POLICY IF EXISTS "conversas_insert_auth" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "conversas_select_participant" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "mensagens_insert_auth" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "mensagens_select_participant" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "Users can add participants" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "Users can update their participation" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "Usuários podem atualizar sua leitura" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_delete_simple" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_insert_auth" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_select_own" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_update_own" ON public.chat_interno_participantes;

-- Create a security definer function to get user's conversations without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_auth_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.conversa_id
  FROM chat_interno_participantes p
  JOIN usuarios u ON p.usuario_id = u.id
  WHERE u.auth_user_id = _auth_uid;
$$;

-- Create a security definer function to get current user's usuario_id
CREATE OR REPLACE FUNCTION public.get_current_usuario_id_safe()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- SIMPLE POLICIES FOR chat_interno_participantes (no recursion)
CREATE POLICY "participantes_select" ON public.chat_interno_participantes
FOR SELECT TO authenticated
USING (usuario_id = get_current_usuario_id_safe());

CREATE POLICY "participantes_insert" ON public.chat_interno_participantes
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "participantes_update" ON public.chat_interno_participantes
FOR UPDATE TO authenticated
USING (usuario_id = get_current_usuario_id_safe());

CREATE POLICY "participantes_delete" ON public.chat_interno_participantes
FOR DELETE TO authenticated
USING (usuario_id = get_current_usuario_id_safe());

-- SIMPLE POLICIES FOR chat_interno_conversas (use security definer function)
CREATE POLICY "conversas_select" ON public.chat_interno_conversas
FOR SELECT TO authenticated
USING (id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "conversas_insert" ON public.chat_interno_conversas
FOR INSERT TO authenticated
WITH CHECK (true);

-- SIMPLE POLICIES FOR chat_interno_mensagens (use security definer function)
CREATE POLICY "mensagens_select" ON public.chat_interno_mensagens
FOR SELECT TO authenticated
USING (conversa_id IN (SELECT get_user_conversation_ids(auth.uid())));

CREATE POLICY "mensagens_insert" ON public.chat_interno_mensagens
FOR INSERT TO authenticated
WITH CHECK (true);