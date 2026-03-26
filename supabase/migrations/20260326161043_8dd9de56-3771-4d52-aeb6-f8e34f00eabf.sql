DROP POLICY IF EXISTS "Usuários podem gerenciar produtos do estabelecimento" ON public.produtos_importados;

CREATE POLICY "Usuários podem gerenciar produtos do estabelecimento"
ON public.produtos_importados
FOR ALL
TO authenticated
USING (
  (estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM usuarios u WHERE u.auth_user_id = auth.uid()
  ))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM usuarios u WHERE u.auth_user_id = auth.uid()
  ))
  OR
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);