-- Usuários admin podem ver e gerenciar TUDO do seu estabelecimento
-- Independente de quem criou (administrador do sistema ou outro usuário)

-- ============================================
-- BOT_FLOWS: Simplificar acesso
-- ============================================

DROP POLICY IF EXISTS "Usuarios admin veem bots do estabelecimento ou sem estabelecime" ON public.bot_flows;
DROP POLICY IF EXISTS "Usuarios podem gerenciar bots do estabelecimento" ON public.bot_flows;
DROP POLICY IF EXISTS "Usuarios admin gerenciam bots do estabelecimento" ON public.bot_flows;

-- Usuários veem bots do seu estabelecimento (SELECT)
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
  OR NOT roles_present()
);

-- Usuários admin/gestor gerenciam bots do estabelecimento (INSERT/UPDATE/DELETE)
CREATE POLICY "Admin e gestor gerenciam bots do estabelecimento"
ON public.bot_flows
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
);

-- ============================================
-- RELATORIOS: Simplificar acesso
-- ============================================

DROP POLICY IF EXISTS "Usuarios veem relatorios do estabelecimento ou sem estabelecimento" ON public.relatorios;
DROP POLICY IF EXISTS "Usuarios admin gerenciam relatorios do estabelecimento" ON public.relatorios;
DROP POLICY IF EXISTS "Usuarios admin veem relatorios do estabelecimento ou sem estabe" ON public.relatorios;

-- Usuários veem relatórios do seu estabelecimento (SELECT)
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
  OR NOT roles_present()
);

-- Usuários admin/gestor gerenciam relatórios do estabelecimento (INSERT/UPDATE/DELETE)
CREATE POLICY "Admin e gestor gerenciam relatorios do estabelecimento"
ON public.relatorios
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
);

-- ============================================
-- OMNICHANNEL_FLOWS: Mesma lógica
-- ============================================

DROP POLICY IF EXISTS "Usuarios admin veem flows do estabelecimento ou sem estabelecim" ON public.omnichannel_flows;

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
  OR NOT roles_present()
);

-- ============================================
-- SKILLS: Mesma lógica
-- ============================================

DROP POLICY IF EXISTS "Usuarios admin veem skills do estabelecimento ou sem estabelecimento" ON public.skills;

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
  OR NOT roles_present()
);