-- Atualizar política de visualização para permitir todos os usuários do estabelecimento
DROP POLICY IF EXISTS "Users can view resend config from same estabelecimento" ON public.resend_config;

CREATE POLICY "All users can view resend config from same estabelecimento"
ON public.resend_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);