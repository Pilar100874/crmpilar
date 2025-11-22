-- Corrigir políticas RLS para incluir administradores do sistema

-- ============================================
-- BOT_FLOWS: Incluir administradores
-- ============================================

DROP POLICY IF EXISTS "Usuarios veem bots do seu estabelecimento" ON public.bot_flows;
DROP POLICY IF EXISTS "Admin e gestor gerenciam bots do estabelecimento" ON public.bot_flows;

-- SELECT: Usuários veem bots do seu estabelecimento OU administradores veem tudo
CREATE POLICY "Usuarios veem bots do seu estabelecimento"
ON public.bot_flows
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ALL: Admin/gestor do estabelecimento OU administradores gerenciam tudo
CREATE POLICY "Admin e gestor gerenciam bots do estabelecimento"
ON public.bot_flows
FOR ALL
TO authenticated
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ============================================
-- RELATORIOS: Incluir administradores
-- ============================================

DROP POLICY IF EXISTS "Usuarios veem relatorios do seu estabelecimento" ON public.relatorios;
DROP POLICY IF EXISTS "Admin e gestor gerenciam relatorios do estabelecimento" ON public.relatorios;
DROP POLICY IF EXISTS "Administradores veem todos relatorios" ON public.relatorios;
DROP POLICY IF EXISTS "Administradores gerenciam todos relatorios" ON public.relatorios;

-- SELECT: Usuários veem relatórios do seu estabelecimento OU administradores veem tudo
CREATE POLICY "Usuarios veem relatorios do seu estabelecimento"
ON public.relatorios
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ALL: Admin/gestor do estabelecimento OU administradores gerenciam tudo
CREATE POLICY "Admin e gestor gerenciam relatorios do estabelecimento"
ON public.relatorios
FOR ALL
TO authenticated
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ============================================
-- OMNICHANNEL_FLOWS: Incluir administradores
-- ============================================

DROP POLICY IF EXISTS "Usuarios veem flows do seu estabelecimento" ON public.omnichannel_flows;

-- SELECT: Usuários veem flows do seu estabelecimento OU administradores veem tudo
CREATE POLICY "Usuarios veem flows do seu estabelecimento"
ON public.omnichannel_flows
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ALL: Admin/gestor do estabelecimento OU administradores gerenciam tudo
CREATE POLICY "Admin e gestor gerenciam flows do estabelecimento"
ON public.omnichannel_flows
FOR ALL
TO authenticated
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ============================================
-- SKILLS: Incluir administradores
-- ============================================

DROP POLICY IF EXISTS "Usuarios veem skills do seu estabelecimento" ON public.skills;

-- SELECT: Usuários veem skills do seu estabelecimento OU skills globais OU administradores veem tudo
CREATE POLICY "Usuarios veem skills do seu estabelecimento"
ON public.skills
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR estabelecimento_id IS NULL
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- ALL: Admin/gestor do estabelecimento OU administradores gerenciam tudo
CREATE POLICY "Admin e gestor gerenciam skills do estabelecimento"
ON public.skills
FOR ALL
TO authenticated
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id 
      FROM usuarios 
      WHERE auth_user_id = auth.uid()
    )
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  )
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);