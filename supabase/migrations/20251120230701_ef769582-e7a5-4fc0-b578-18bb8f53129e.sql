-- Corrigir política de visualização da tabela skills para usar auth_user_id
DROP POLICY IF EXISTS "Usuários podem ver skills" ON skills;
DROP POLICY IF EXISTS "Admins podem gerenciar skills" ON skills;

-- Política para visualização (corrigida)
CREATE POLICY "Usuários podem ver skills"
ON skills
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Política para gerenciamento completo (INSERT, UPDATE, DELETE) (corrigida)
CREATE POLICY "Admins podem gerenciar skills"
ON skills
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