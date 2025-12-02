-- Drop ALL existing policies on chat tables first
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename IN ('chat_interno_participantes', 'chat_interno_mensagens', 'chat_interno_conversas')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, 
      CASE 
        WHEN pol.policyname LIKE '%participantes%' OR pol.policyname LIKE '%chat_participantes%' THEN 'chat_interno_participantes'
        WHEN pol.policyname LIKE '%mensagens%' OR pol.policyname LIKE '%chat_mensagens%' THEN 'chat_interno_mensagens'
        ELSE 'chat_interno_conversas'
      END
    );
  END LOOP;
END $$;

-- Drop specific policies by name to be sure
DROP POLICY IF EXISTS "chat_participantes_select" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "chat_participantes_insert" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "chat_participantes_delete" ON public.chat_interno_participantes;
DROP POLICY IF EXISTS "chat_mensagens_select" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "chat_mensagens_insert" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "chat_conversas_select" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "chat_conversas_insert" ON public.chat_interno_conversas;

-- Create security definer function to get user id
CREATE OR REPLACE FUNCTION public.get_current_usuario_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Create security definer function to get user's conversations
CREATE OR REPLACE FUNCTION public.get_user_conversas()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversa_id FROM public.chat_interno_participantes 
  WHERE usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1);
$$;

-- Simple policies using the security definer functions
CREATE POLICY "participantes_select" ON public.chat_interno_participantes
FOR SELECT TO authenticated
USING (conversa_id IN (SELECT public.get_user_conversas()));

CREATE POLICY "participantes_insert" ON public.chat_interno_participantes
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "participantes_delete" ON public.chat_interno_participantes
FOR DELETE TO authenticated
USING (usuario_id = public.get_current_usuario_id());

CREATE POLICY "mensagens_select" ON public.chat_interno_mensagens
FOR SELECT TO authenticated
USING (conversa_id IN (SELECT public.get_user_conversas()));

CREATE POLICY "mensagens_insert" ON public.chat_interno_mensagens
FOR INSERT TO authenticated
WITH CHECK (conversa_id IN (SELECT public.get_user_conversas()));

CREATE POLICY "conversas_select" ON public.chat_interno_conversas
FOR SELECT TO authenticated
USING (id IN (SELECT public.get_user_conversas()));

CREATE POLICY "conversas_insert" ON public.chat_interno_conversas
FOR INSERT TO authenticated
WITH CHECK (true);