-- Fix RLS policy for chat_interno_participantes to allow seeing all participants in user's conversations

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "chat_interno_participantes_select_policy" ON public.chat_interno_participantes;

-- Create a new SELECT policy that allows users to see all participants in conversations they're part of
CREATE POLICY "chat_interno_participantes_select_policy" ON public.chat_interno_participantes
  FOR SELECT USING (
    conversa_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
  );