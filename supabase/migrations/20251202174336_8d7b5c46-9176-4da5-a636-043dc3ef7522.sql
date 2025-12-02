-- Fix the recursive policy for participantes
DROP POLICY IF EXISTS "participantes_select_simple" ON public.chat_interno_participantes;

-- Create a function to check if user is participant of a conversation
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_interno_participantes 
    WHERE conversa_id = p_conversa_id
    AND usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- Simple policy using the security definer function
CREATE POLICY "participantes_select_v2" ON public.chat_interno_participantes
FOR SELECT TO authenticated
USING (public.is_chat_participant(conversa_id));

-- Also fix mensagens select policy
DROP POLICY IF EXISTS "mensagens_select_simple" ON public.chat_interno_mensagens;

CREATE POLICY "mensagens_select_v2" ON public.chat_interno_mensagens
FOR SELECT TO authenticated
USING (public.is_chat_participant(conversa_id));