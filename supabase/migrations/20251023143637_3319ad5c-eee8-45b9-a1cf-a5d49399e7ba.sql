-- Allow anonymous users to view usuarios list (needed for login flow)
CREATE POLICY "Anyone can view usuarios"
ON usuarios
FOR SELECT
TO anon
USING (true);