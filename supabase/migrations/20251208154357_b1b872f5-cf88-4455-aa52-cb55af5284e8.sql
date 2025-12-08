-- Create helper function to get user's estabelecimento_id
CREATE OR REPLACE FUNCTION public.get_auth_user_estabelecimento_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Drop and recreate policy using the helper function
DROP POLICY IF EXISTS "conversas_insert" ON public.chat_interno_conversas;

CREATE POLICY "conversas_insert" 
ON public.chat_interno_conversas 
FOR INSERT 
TO authenticated
WITH CHECK (
  estabelecimento_id = get_auth_user_estabelecimento_id()
);