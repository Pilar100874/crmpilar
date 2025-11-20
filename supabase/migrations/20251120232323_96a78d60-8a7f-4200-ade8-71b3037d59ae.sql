-- Drop todas as políticas existentes da tabela atendente_skills
DROP POLICY IF EXISTS "Admins podem gerenciar atendente skills" ON atendente_skills;
DROP POLICY IF EXISTS "Usuários podem ver atendente skills" ON atendente_skills;
DROP POLICY IF EXISTS "Usuários podem ver skills de atendentes" ON atendente_skills;
DROP POLICY IF EXISTS "Admins podem adicionar skills de atendentes" ON atendente_skills;
DROP POLICY IF EXISTS "Admins podem atualizar skills de atendentes" ON atendente_skills;
DROP POLICY IF EXISTS "Admins podem remover skills de atendentes" ON atendente_skills;

-- Política para SELECT: usuários podem ver skills de atendentes do seu estabelecimento
CREATE POLICY "view_atendente_skills"
ON atendente_skills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes
    WHERE atendentes.id = atendente_skills.atendente_id
    AND (
      atendentes.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
);

-- Política para INSERT: admins e gestores podem adicionar skills
CREATE POLICY "insert_atendente_skills"
ON atendente_skills
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM atendentes
    WHERE atendentes.id = atendente_skills.atendente_id
    AND (
      atendentes.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);

-- Política para UPDATE: admins e gestores podem atualizar skills
CREATE POLICY "update_atendente_skills"
ON atendente_skills
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes
    WHERE atendentes.id = atendente_skills.atendente_id
    AND (
      atendentes.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
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
    SELECT 1 FROM atendentes
    WHERE atendentes.id = atendente_skills.atendente_id
    AND (
      atendentes.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);

-- Política para DELETE: admins e gestores podem remover skills
CREATE POLICY "delete_atendente_skills"
ON atendente_skills
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes
    WHERE atendentes.id = atendente_skills.atendente_id
    AND (
      atendentes.estabelecimento_id IN (
        SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
      )
      OR
      EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    )
  )
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR NOT roles_present()
  )
);