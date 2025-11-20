-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can manage skills" ON skills;
DROP POLICY IF EXISTS "Users can view skills" ON skills;
DROP POLICY IF EXISTS "Users can create skills" ON skills;
DROP POLICY IF EXISTS "Users can update skills" ON skills;
DROP POLICY IF EXISTS "Users can delete skills" ON skills;

-- Criar políticas para skills
CREATE POLICY "Users can view skills"
ON skills FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create skills"
ON skills FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update skills"
ON skills FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete skills"
ON skills FOR DELETE
TO authenticated
USING (true);

-- Remover políticas existentes de filas_atendimento se houver
DROP POLICY IF EXISTS "Users can manage filas" ON filas_atendimento;
DROP POLICY IF EXISTS "Users can view filas" ON filas_atendimento;
DROP POLICY IF EXISTS "Users can create filas" ON filas_atendimento;
DROP POLICY IF EXISTS "Users can update filas" ON filas_atendimento;
DROP POLICY IF EXISTS "Users can delete filas" ON filas_atendimento;

-- Criar políticas para filas_atendimento
CREATE POLICY "Users can view filas"
ON filas_atendimento FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create filas"
ON filas_atendimento FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update filas"
ON filas_atendimento FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete filas"
ON filas_atendimento FOR DELETE
TO authenticated
USING (true);