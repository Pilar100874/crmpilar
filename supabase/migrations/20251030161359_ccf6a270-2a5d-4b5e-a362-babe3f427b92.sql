-- Tornar a política de INSERT mais permissiva temporariamente para desenvolvimento
-- Remove política antiga
DROP POLICY IF EXISTS "Users can create marketing automations for their establishment" ON marketing_automations;

-- Cria política nova que permite inserção se o estabelecimento_id corresponder
CREATE POLICY "Allow insert marketing automations for matching establishment"
ON marketing_automations
FOR INSERT
WITH CHECK (
  -- Se não há auth, permite qualquer estabelecimento que exista
  (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM estabelecimentos WHERE id = estabelecimento_id))
  OR
  -- Se há auth, verifica se é do mesmo estabelecimento
  (estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  ))
);

-- Atualizar política de UPDATE também
DROP POLICY IF EXISTS "Users can update marketing automations from their establishment" ON marketing_automations;

CREATE POLICY "Allow update marketing automations for matching establishment"
ON marketing_automations
FOR UPDATE
USING (
  (auth.uid() IS NULL)
  OR
  (estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  ))
);

-- Atualizar política de DELETE também
DROP POLICY IF EXISTS "Users can delete marketing automations from their establishment" ON marketing_automations;

CREATE POLICY "Allow delete marketing automations for matching establishment"
ON marketing_automations
FOR DELETE
USING (
  (auth.uid() IS NULL)
  OR
  (estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  ))
);

-- Atualizar política de SELECT também
DROP POLICY IF EXISTS "Users can view marketing automations from their establishment" ON marketing_automations;

CREATE POLICY "Allow view marketing automations for matching establishment"
ON marketing_automations
FOR SELECT
USING (
  (auth.uid() IS NULL)
  OR
  (estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE id = auth.uid()
  ))
);