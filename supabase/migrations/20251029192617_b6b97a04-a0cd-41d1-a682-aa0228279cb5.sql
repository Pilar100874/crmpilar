-- Fix RLS policies for form_field_configs to allow inserts for admins
DROP POLICY IF EXISTS "Users can manage configs from their estabelecimento" ON form_field_configs;
DROP POLICY IF EXISTS "Users can view configs from their estabelecimento" ON form_field_configs;

-- Policy for viewing configs
CREATE POLICY "Users can view configs from their estabelecimento"
ON form_field_configs
FOR SELECT
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Policy for managing configs (insert, update, delete)
CREATE POLICY "Users can manage configs from their estabelecimento"
ON form_field_configs
FOR ALL
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);