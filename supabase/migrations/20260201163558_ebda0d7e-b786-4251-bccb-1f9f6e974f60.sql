-- Corrigir política de SELECT que está errada
DROP POLICY IF EXISTS "Usuarios podem ver atividades do estabelecimento" ON public.user_activity_tracking;

CREATE POLICY "Usuarios podem ver atividades do estabelecimento" 
ON public.user_activity_tracking
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id 
    FROM usuarios u 
    WHERE u.auth_user_id = auth.uid()
  )
);