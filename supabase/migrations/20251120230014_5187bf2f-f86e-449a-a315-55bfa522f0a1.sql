-- Remover políticas antigas da tabela atendentes
DROP POLICY IF EXISTS "Admins podem gerenciar atendentes" ON atendentes;
DROP POLICY IF EXISTS "Atendentes podem atualizar próprio status" ON atendentes;
DROP POLICY IF EXISTS "Usuários podem ver atendentes do estabelecimento" ON atendentes;

-- Política para visualização
CREATE POLICY "Usuários podem ver atendentes do estabelecimento"
ON atendentes
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

-- Política para gerenciamento completo (INSERT, UPDATE, DELETE) por admins/gestores
CREATE POLICY "Admins podem gerenciar atendentes"
ON atendentes
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
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
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());