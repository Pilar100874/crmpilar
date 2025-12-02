-- Drop all chat policies first
DROP POLICY IF EXISTS "participantes_select" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_insert" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_delete" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "mensagens_select" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "mensagens_insert" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "conversas_select" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "conversas_insert" ON public.chat_interno_conversas;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.get_user_conversas();

-- Create a simple function that checks if user belongs to establishment
CREATE OR REPLACE FUNCTION public.user_in_estabelecimento(estab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE auth_user_id = auth.uid() 
    AND estabelecimento_id = estab_id
  );
$$;

-- Simple policies for chat_interno_conversas
-- Users can insert conversations for their establishment
CREATE POLICY "conversas_insert_simple" ON public.chat_interno_conversas
FOR INSERT TO authenticated
WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

-- Users can view conversations from their establishment
CREATE POLICY "conversas_select_simple" ON public.chat_interno_conversas
FOR SELECT TO authenticated
USING (public.user_in_estabelecimento(estabelecimento_id));

-- Simple policies for chat_interno_participantes
-- Users can insert participants
CREATE POLICY "participantes_insert_simple" ON public.chat_interno_participantes
FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can view participants based on their user id or conversations they're in
CREATE POLICY "participantes_select_simple" ON public.chat_interno_participantes
FOR SELECT TO authenticated
USING (
  usuario_id = public.get_current_usuario_id()
  OR 
  EXISTS (
    SELECT 1 FROM public.chat_interno_participantes p2
    WHERE p2.conversa_id = chat_interno_participantes.conversa_id
    AND p2.usuario_id = public.get_current_usuario_id()
  )
);

-- Users can delete their own participation
CREATE POLICY "participantes_delete_simple" ON public.chat_interno_participantes
FOR DELETE TO authenticated
USING (usuario_id = public.get_current_usuario_id());

-- Simple policies for chat_interno_mensagens
CREATE POLICY "mensagens_insert_simple" ON public.chat_interno_mensagens
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "mensagens_select_simple" ON public.chat_interno_mensagens
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_interno_participantes p
    WHERE p.conversa_id = chat_interno_mensagens.conversa_id
    AND p.usuario_id = public.get_current_usuario_id()
  )
);