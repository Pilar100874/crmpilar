-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view fila_skills" ON fila_skills;
DROP POLICY IF EXISTS "Users can manage fila_skills" ON fila_skills;
DROP POLICY IF EXISTS "Admins podem gerenciar fila skills" ON fila_skills;
DROP POLICY IF EXISTS "Usuários podem ver fila skills" ON fila_skills;

-- Criar política para visualização
CREATE POLICY "Usuários podem ver fila skills"
ON fila_skills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM filas_atendimento f
    WHERE f.id = fila_skills.fila_id
    AND f.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  )
);

-- Criar política para gerenciamento (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins podem gerenciar fila skills"
ON fila_skills
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM filas_atendimento f
    WHERE f.id = fila_skills.fila_id
    AND f.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM filas_atendimento f
    WHERE f.id = fila_skills.fila_id
    AND f.estabelecimento_id IN (
      SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);