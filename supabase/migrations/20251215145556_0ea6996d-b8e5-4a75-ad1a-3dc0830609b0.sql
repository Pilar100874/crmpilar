-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view logistica config" ON logistica_config;
DROP POLICY IF EXISTS "Users can update logistica config" ON logistica_config;
DROP POLICY IF EXISTS "Users can insert logistica config" ON logistica_config;

-- Create fixed policies without direct auth.users access
CREATE POLICY "Users can view logistica config" ON logistica_config
FOR SELECT USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update logistica config" ON logistica_config
FOR UPDATE USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert logistica config" ON logistica_config
FOR INSERT WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);