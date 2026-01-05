-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their establishment AI keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can insert AI keys for their establishment" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can update their establishment AI keys" ON public.ai_api_keys;
DROP POLICY IF EXISTS "Users can delete their establishment AI keys" ON public.ai_api_keys;

-- Recreate policies using auth_user_id instead of id
CREATE POLICY "Users can view their establishment AI keys" 
ON public.ai_api_keys 
FOR SELECT 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert AI keys for their establishment" 
ON public.ai_api_keys 
FOR INSERT 
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their establishment AI keys" 
ON public.ai_api_keys 
FOR UPDATE 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can delete their establishment AI keys" 
ON public.ai_api_keys 
FOR DELETE 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));