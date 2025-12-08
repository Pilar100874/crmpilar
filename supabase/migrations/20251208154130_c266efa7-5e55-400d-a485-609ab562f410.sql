-- Drop existing insert policy
DROP POLICY IF EXISTS "conversas_insert" ON public.chat_interno_conversas;

-- Create new insert policy that validates user belongs to the establishment
CREATE POLICY "conversas_insert" 
ON public.chat_interno_conversas 
FOR INSERT 
TO authenticated
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR 
  has_role(auth.uid(), 'admin')
);