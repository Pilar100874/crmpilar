-- Remover políticas antigas da tabela skills
DROP POLICY IF EXISTS "Users can view skills" ON skills;
DROP POLICY IF EXISTS "Users can manage skills" ON skills;
DROP POLICY IF EXISTS "Admins podem gerenciar skills" ON skills;
DROP POLICY IF EXISTS "Usuários podem ver skills" ON skills;

-- Política para visualização
CREATE POLICY "Usuários podem ver skills"
ON skills
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
);

-- Política para gerenciamento completo (INSERT, UPDATE, DELETE) por admins/gestores
CREATE POLICY "Admins podem gerenciar skills"
ON skills
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