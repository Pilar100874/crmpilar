-- Drop existing policies for atendente_skills
DROP POLICY IF EXISTS "Usuários podem ver skills de atendentes" ON atendente_skills;
DROP POLICY IF EXISTS "Admins podem gerenciar skills de atendentes" ON atendente_skills;

-- Create new policies for atendente_skills

-- SELECT: Users can view skills from attendants in their establishment or admins can view all
CREATE POLICY "Users can view atendente skills"
ON atendente_skills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes a
    JOIN usuarios u ON u.id = auth.uid()
    WHERE a.id = atendente_skills.atendente_id
    AND a.estabelecimento_id = u.estabelecimento_id
  )
  OR EXISTS (
    SELECT 1 FROM administradores
    WHERE administradores.id = auth.uid()
  )
);

-- INSERT: Admins and gestores can add skills to attendants in their establishment
CREATE POLICY "Admins can insert atendente skills"
ON atendente_skills
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM atendentes a
    JOIN usuarios u ON u.id = auth.uid()
    WHERE a.id = atendente_skills.atendente_id
    AND a.estabelecimento_id = u.estabelecimento_id
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'gestor')
      OR NOT roles_present()
    )
  )
  OR EXISTS (
    SELECT 1 FROM administradores
    WHERE administradores.id = auth.uid()
  )
);

-- UPDATE: Admins and gestores can update skills of attendants in their establishment
CREATE POLICY "Admins can update atendente skills"
ON atendente_skills
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes a
    JOIN usuarios u ON u.id = auth.uid()
    WHERE a.id = atendente_skills.atendente_id
    AND a.estabelecimento_id = u.estabelecimento_id
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'gestor')
      OR NOT roles_present()
    )
  )
  OR EXISTS (
    SELECT 1 FROM administradores
    WHERE administradores.id = auth.uid()
  )
);

-- DELETE: Admins and gestores can delete skills from attendants in their establishment
CREATE POLICY "Admins can delete atendente skills"
ON atendente_skills
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM atendentes a
    JOIN usuarios u ON u.id = auth.uid()
    WHERE a.id = atendente_skills.atendente_id
    AND a.estabelecimento_id = u.estabelecimento_id
    AND (
      has_role(auth.uid(), 'admin') 
      OR has_role(auth.uid(), 'gestor')
      OR NOT roles_present()
    )
  )
  OR EXISTS (
    SELECT 1 FROM administradores
    WHERE administradores.id = auth.uid()
  )
);