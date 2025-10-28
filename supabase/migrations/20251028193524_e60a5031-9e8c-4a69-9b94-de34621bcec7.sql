-- Remover política anterior
DROP POLICY IF EXISTS "Manage orcamento itens (authenticated)" ON orcamento_itens;

-- Nova política: permitir para usuários do estabelecimento ou admin emails
CREATE POLICY "Manage orcamento itens (flexible)"
  ON orcamento_itens
  FOR ALL
  USING (
    -- Admin emails têm acesso
    (auth.jwt() ->> 'email') LIKE 'admin_%@sistema.local'
    OR
    -- Usuário do mesmo estabelecimento
    EXISTS (
      SELECT 1 FROM orcamentos o
      JOIN usuarios u ON u.estabelecimento_id = o.estabelecimento_id
      WHERE o.id = orcamento_itens.orcamento_id
      AND u.id = auth.uid()
    )
    OR
    -- Admin na tabela administradores
    EXISTS (
      SELECT 1 FROM administradores
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    -- Admin emails têm acesso
    (auth.jwt() ->> 'email') LIKE 'admin_%@sistema.local'
    OR
    -- Usuário do mesmo estabelecimento
    EXISTS (
      SELECT 1 FROM orcamentos o
      JOIN usuarios u ON u.estabelecimento_id = o.estabelecimento_id
      WHERE o.id = orcamento_itens.orcamento_id
      AND u.id = auth.uid()
    )
    OR
    -- Admin na tabela administradores
    EXISTS (
      SELECT 1 FROM administradores
      WHERE id = auth.uid()
    )
  );