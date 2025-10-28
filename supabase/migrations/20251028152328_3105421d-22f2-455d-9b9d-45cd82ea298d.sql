-- Standardize RLS manage policies across establishment-scoped tables
-- Add safe bootstrap fallback: allow ops when no roles configured (NOT roles_present())

-- API_ENDPOINTS
DROP POLICY IF EXISTS "Manage api endpoints (same estab admin/gestor or admin)" ON public.api_endpoints;
CREATE POLICY "Manage api endpoints (same estab admin/gestor or admin)"
ON public.api_endpoints
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- CAMPAIGNS
DROP POLICY IF EXISTS "Manage campaigns (same estab admin/gestor or admin)" ON public.campaigns;
CREATE POLICY "Manage campaigns (same estab admin/gestor or admin)"
ON public.campaigns
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- CONTENTS
DROP POLICY IF EXISTS "Manage contents (same estab admin/gestor or admin)" ON public.contents;
CREATE POLICY "Manage contents (same estab admin/gestor or admin)"
ON public.contents
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- CONVERSATIONS (separate policies)
DROP POLICY IF EXISTS "Insert conversations (same estab)" ON public.conversations;
CREATE POLICY "Insert conversations (same estab)"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

DROP POLICY IF EXISTS "Update conversations (same estab)" ON public.conversations;
CREATE POLICY "Update conversations (same estab)"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

DROP POLICY IF EXISTS "Delete conversations (same estab admin/gestor)" ON public.conversations;
CREATE POLICY "Delete conversations (same estab admin/gestor)"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- DATABASE_CONNECTIONS
DROP POLICY IF EXISTS "Manage database connections (admin/gestor or admin)" ON public.database_connections;
CREATE POLICY "Manage database connections (admin/gestor or admin)"
ON public.database_connections
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- FLOWS
DROP POLICY IF EXISTS "Manage flows (same estab admin/gestor or admin)" ON public.flows;
CREATE POLICY "Manage flows (same estab admin/gestor or admin)"
ON public.flows
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- BOT_FLOWS (separate, keep admin email bypass)
DROP POLICY IF EXISTS "Insert bot flows (admin email bypass)" ON public.bot_flows;
CREATE POLICY "Insert bot flows (admin email bypass)"
ON public.bot_flows
FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

DROP POLICY IF EXISTS "Update bot flows (admin email bypass)" ON public.bot_flows;
CREATE POLICY "Update bot flows (admin email bypass)"
ON public.bot_flows
FOR UPDATE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
)
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

DROP POLICY IF EXISTS "Delete bot flows (admin email bypass)" ON public.bot_flows;
CREATE POLICY "Delete bot flows (admin email bypass)"
ON public.bot_flows
FOR DELETE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

-- FUNIL_DEALS
DROP POLICY IF EXISTS "Manage deals (same estab or admin)" ON public.funil_deals;
CREATE POLICY "Manage deals (same estab or admin)"
ON public.funil_deals
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- FUNIS (insert/update/delete)
DROP POLICY IF EXISTS "Insert funis (admin email or estab)" ON public.funis;
CREATE POLICY "Insert funis (admin email or estab)"
ON public.funis
FOR INSERT
TO authenticated
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

DROP POLICY IF EXISTS "Update funis (admin email or estab)" ON public.funis;
CREATE POLICY "Update funis (admin email or estab)"
ON public.funis
FOR UPDATE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
)
WITH CHECK (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

DROP POLICY IF EXISTS "Delete funis (admin email or estab)" ON public.funis;
CREATE POLICY "Delete funis (admin email or estab)"
ON public.funis
FOR DELETE
TO authenticated
USING (
  ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local')
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
      AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
);

-- ORCAMENTOS
DROP POLICY IF EXISTS "Manage orcamentos (same estab or admin)" ON public.orcamentos;
CREATE POLICY "Manage orcamentos (same estab or admin)"
ON public.orcamentos
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- ORCAMENTO_ITENS
DROP POLICY IF EXISTS "Manage orcamento itens (same estab or admin)" ON public.orcamento_itens;
CREATE POLICY "Manage orcamento itens (same estab or admin)"
ON public.orcamento_itens
FOR ALL
TO authenticated
USING (
  (EXISTS (
     SELECT 1 FROM orcamentos o
     WHERE o.id = orcamento_itens.orcamento_id
       AND ((o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  ))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  (EXISTS (
     SELECT 1 FROM orcamentos o
     WHERE o.id = orcamento_itens.orcamento_id
       AND ((o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  ))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- ORCAMENTO_HISTORICO (insert only)
DROP POLICY IF EXISTS "Insert orcamento historico (same estab or admin)" ON public.orcamento_historico;
CREATE POLICY "Insert orcamento historico (same estab or admin)"
ON public.orcamento_historico
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
     SELECT 1 FROM orcamentos o
     WHERE o.id = orcamento_historico.orcamento_id
       AND ((o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  ))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- PRODUTOS_SUGERIDOS
DROP POLICY IF EXISTS "Manage produtos sugeridos (same estab or admin)" ON public.produtos_sugeridos;
CREATE POLICY "Manage produtos sugeridos (same estab or admin)"
ON public.produtos_sugeridos
FOR ALL
TO authenticated
USING (
  (EXISTS (
     SELECT 1 FROM orcamentos o
     WHERE o.id = produtos_sugeridos.orcamento_id
       AND ((o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  ))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  (EXISTS (
     SELECT 1 FROM orcamentos o
     WHERE o.id = produtos_sugeridos.orcamento_id
       AND ((o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  ))
  AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present())
);

-- TABELAS_PRECO (manage)
DROP POLICY IF EXISTS "Manage tabelas preco (admin/gestor or admin)" ON public.tabelas_preco;
CREATE POLICY "Manage tabelas preco (admin/gestor or admin)"
ON public.tabelas_preco
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
   AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR NOT roles_present()))
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);
