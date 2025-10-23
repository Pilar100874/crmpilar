-- Allow anonymous users to view estabelecimentos list (needed for login flow)
CREATE POLICY "Anyone can view estabelecimentos"
ON estabelecimentos
FOR SELECT
TO anon
USING (true);