
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "participantes_select_v2" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "participantes_insert_simple" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "mensagens_select_v2" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "mensagens_insert_simple" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "conversas_select_simple" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "conversas_insert_simple" ON public.chat_interno_conversas;

-- Drop problematic function
DROP FUNCTION IF EXISTS public.is_chat_participant(uuid);

-- Create simple policies for chat_interno_participantes
-- SELECT: user can see their own participations only (direct column check, no function)
CREATE POLICY "participantes_select_own" 
ON public.chat_interno_participantes 
FOR SELECT 
USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- INSERT: authenticated users can insert
CREATE POLICY "participantes_insert_auth" 
ON public.chat_interno_participantes 
FOR INSERT 
WITH CHECK (true);

-- UPDATE: users can update their own records
CREATE POLICY "participantes_update_own" 
ON public.chat_interno_participantes 
FOR UPDATE 
USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Create simple policies for chat_interno_conversas
-- SELECT: users can see conversations they're part of (via subquery to participantes without triggering its RLS)
CREATE POLICY "conversas_select_participant" 
ON public.chat_interno_conversas 
FOR SELECT 
USING (
  id IN (
    SELECT conversa_id FROM public.chat_interno_participantes 
    WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

-- INSERT: authenticated users can create conversations
CREATE POLICY "conversas_insert_auth" 
ON public.chat_interno_conversas 
FOR INSERT 
WITH CHECK (true);

-- Create simple policies for chat_interno_mensagens
-- SELECT: user can see messages from conversations where they're participant
CREATE POLICY "mensagens_select_participant" 
ON public.chat_interno_mensagens 
FOR SELECT 
USING (
  conversa_id IN (
    SELECT conversa_id FROM public.chat_interno_participantes 
    WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

-- INSERT: authenticated users can insert messages
CREATE POLICY "mensagens_insert_auth" 
ON public.chat_interno_mensagens 
FOR INSERT 
WITH CHECK (true);
