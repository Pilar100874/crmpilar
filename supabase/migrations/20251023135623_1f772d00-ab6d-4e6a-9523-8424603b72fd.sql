-- Drop existing policies for estabelecimentos
DROP POLICY IF EXISTS "Administrators can manage estabelecimentos" ON estabelecimentos;
DROP POLICY IF EXISTS "Administrators can view estabelecimentos" ON estabelecimentos;

-- Create new policies that work with the current auth setup
-- Allow authenticated users to view estabelecimentos
CREATE POLICY "Authenticated users can view estabelecimentos"
ON estabelecimentos
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to manage estabelecimentos
-- (This is temporary until proper admin auth is implemented)
CREATE POLICY "Authenticated users can manage estabelecimentos"
ON estabelecimentos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);