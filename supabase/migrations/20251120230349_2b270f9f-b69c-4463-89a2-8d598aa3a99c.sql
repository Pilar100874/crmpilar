-- Corrigir RLS da tabela atendentes para usar usuarios.auth_user_id em vez de usuarios.id
DROP POLICY IF EXISTS "Usuários podem ver atendentes do estabelecimento" ON atendentes;
DROP POLICY IF EXISTS "Admins podem gerenciar atendentes" ON atendentes;
DROP POLICY IF EXISTS "Atendentes podem atualizar próprio status" ON atendentes;

-- Política para visualização
CREATE POLICY "Usuários podem ver atendentes do estabelecimento"
ON atendentes
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Política para gerenciamento completo (INSERT, UPDATE, DELETE) por admins/gestores
CREATE POLICY "Admins podem gerenciar atendentes"
ON atendentes
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);

-- Política para atendentes atualizarem seu próprio status
CREATE POLICY "Atendentes podem atualizar próprio status"
ON atendentes
FOR UPDATE
TO authenticated
USING (usuario_id = (
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1
))
WITH CHECK (usuario_id = (
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1
));