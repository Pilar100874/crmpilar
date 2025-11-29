-- Drop existing policies
DROP POLICY IF EXISTS "Users can view logistica config" ON public.logistica_config;
DROP POLICY IF EXISTS "Users can insert logistica config" ON public.logistica_config;
DROP POLICY IF EXISTS "Users can update logistica config" ON public.logistica_config;

-- Create improved policies that properly identify system admins by email
CREATE POLICY "Users can view logistica config"
ON public.logistica_config FOR SELECT
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM administradores a 
    WHERE a.cpf || '@sistema.local' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert logistica config"
ON public.logistica_config FOR INSERT
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM administradores a 
    WHERE a.cpf || '@sistema.local' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update logistica config"
ON public.logistica_config FOR UPDATE
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM administradores a 
    WHERE a.cpf || '@sistema.local' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);