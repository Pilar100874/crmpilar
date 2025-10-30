-- Simplificar políticas RLS para marketing_automations (DEV MODE)
-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Allow insert marketing automations (dev-friendly)" ON marketing_automations;
DROP POLICY IF EXISTS "Allow update marketing automations (dev-friendly)" ON marketing_automations;
DROP POLICY IF EXISTS "Allow delete marketing automations (dev-friendly)" ON marketing_automations;
DROP POLICY IF EXISTS "Allow view marketing automations (dev-friendly)" ON marketing_automations;

-- Política ultra-simples: permite tudo (DEV MODE)
CREATE POLICY "Dev allow all on marketing_automations"
ON marketing_automations
FOR ALL
USING (true)
WITH CHECK (true);