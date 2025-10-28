-- Simplificar políticas RLS para orcamento_itens
DROP POLICY IF EXISTS "Manage orcamento itens (same estab or admin)" ON orcamento_itens;
DROP POLICY IF EXISTS "View orcamento itens (same estab or admin)" ON orcamento_itens;

-- Permitir gerenciar itens para usuários do mesmo estabelecimento ou admin
CREATE POLICY "Manage orcamento itens (authenticated)"
  ON orcamento_itens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = orcamento_itens.orcamento_id
      AND (
        o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orcamentos o
      WHERE o.id = orcamento_itens.orcamento_id
      AND (
        o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );