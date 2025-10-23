-- Temporary simplified policies for usuarios table
DROP POLICY IF EXISTS "Users can manage usuarios from same estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Users can view usuarios from same estabelecimento" ON usuarios;

-- Allow authenticated users to manage usuarios (temporary fix)
CREATE POLICY "Authenticated users can manage usuarios"
ON usuarios
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view usuarios
CREATE POLICY "Authenticated users can view usuarios"
ON usuarios
FOR SELECT
TO authenticated
USING (true);