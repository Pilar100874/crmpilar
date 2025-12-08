-- Drop and recreate with simpler policy
DROP POLICY IF EXISTS "conversas_insert" ON public.chat_interno_conversas;

-- Simple policy: authenticated users can insert if they belong to any estabelecimento
CREATE POLICY "conversas_insert" 
ON public.chat_interno_conversas 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
    AND estabelecimento_id = chat_interno_conversas.estabelecimento_id
  )
);