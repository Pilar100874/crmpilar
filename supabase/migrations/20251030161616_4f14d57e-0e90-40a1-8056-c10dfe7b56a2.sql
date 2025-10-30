-- Relax policies to handle sessions without usuarios mapping (dev)
DROP POLICY IF EXISTS "Allow insert marketing automations for matching establishment" ON marketing_automations;
CREATE POLICY "Allow insert marketing automations (dev-friendly)"
ON marketing_automations
FOR INSERT
WITH CHECK (
  -- Unauthenticated: allow if estabelecimento existe
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM estabelecimentos WHERE id = estabelecimento_id))
  OR
  -- Authenticated and mapped: must match user estabelecimento
  (auth.uid() IS NOT NULL AND estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR
  -- Authenticated but not mapped in usuarios (dev): allow if estabelecimento existe
  (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid()) AND EXISTS (SELECT 1 FROM estabelecimentos WHERE id = estabelecimento_id))
);

DROP POLICY IF EXISTS "Allow update marketing automations for matching establishment" ON marketing_automations;
CREATE POLICY "Allow update marketing automations (dev-friendly)"
ON marketing_automations
FOR UPDATE
USING (
  (auth.uid() IS NULL)
  OR
  (auth.uid() IS NOT NULL AND estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR
  (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Allow delete marketing automations for matching establishment" ON marketing_automations;
CREATE POLICY "Allow delete marketing automations (dev-friendly)"
ON marketing_automations
FOR DELETE
USING (
  (auth.uid() IS NULL)
  OR
  (auth.uid() IS NOT NULL AND estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR
  (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid()))
);

DROP POLICY IF EXISTS "Allow view marketing automations for matching establishment" ON marketing_automations;
CREATE POLICY "Allow view marketing automations (dev-friendly)"
ON marketing_automations
FOR SELECT
USING (
  (auth.uid() IS NULL)
  OR
  (auth.uid() IS NOT NULL AND estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR
  (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid()))
);