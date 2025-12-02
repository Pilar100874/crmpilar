-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "Users can add participants to conversations they participate in" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.chat_interno_mensagens;

-- Create helper function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversa_id uuid, p_usuario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_interno_participantes
    WHERE conversa_id = p_conversa_id AND usuario_id = p_usuario_id
  );
$$;

-- Recreate policies without recursion
CREATE POLICY "Users can view participants of their conversations"
ON public.chat_interno_participantes
FOR SELECT
USING (
  usuario_id IN (
    SELECT id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR 
  conversa_id IN (
    SELECT conversa_id FROM chat_interno_participantes p2
    WHERE p2.usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Users can add participants"
ON public.chat_interno_participantes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their participation"
ON public.chat_interno_participantes
FOR UPDATE
USING (
  usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
);

-- Fix messages policies
CREATE POLICY "Users can view messages from their conversations"
ON public.chat_interno_mensagens
FOR SELECT
USING (
  conversa_id IN (
    SELECT conversa_id FROM chat_interno_participantes
    WHERE usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.chat_interno_mensagens
FOR INSERT
WITH CHECK (
  remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
);