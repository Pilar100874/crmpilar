-- Garantir que usuários admin vejam itens criados por administradores do sistema
-- Removendo verificações email obsoletas e simplificando políticas

-- ============================================
-- BOT_FLOWS: Limpar políticas e recriar
-- ============================================

DROP POLICY IF EXISTS "Delete bot flows (admin email bypass)" ON public.bot_flows;
DROP POLICY IF EXISTS "Insert bot flows (admin email bypass)" ON public.bot_flows;
DROP POLICY IF EXISTS "Update bot flows (admin email bypass)" ON public.bot_flows;

-- Política de escrita para usuários admin/gestor
CREATE POLICY "Usuarios admin gerenciam bots do estabelecimento"
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

-- Administradores do sistema podem criar/editar tudo
CREATE POLICY "Administradores gerenciam todos bots"
ON public.bot_flows
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- ============================================
-- RELATORIOS: Limpar políticas email e recriar
-- ============================================

DROP POLICY IF EXISTS "Delete relatorios (admin email or same estab)" ON public.relatorios;
DROP POLICY IF EXISTS "Insert relatorios (admin email or same estab)" ON public.relatorios;
DROP POLICY IF EXISTS "Update relatorios (admin email or same estab)" ON public.relatorios;
DROP POLICY IF EXISTS "Usuarios admin veem relatorios do estabelecimento ou sem estabe" ON public.relatorios;

-- Política de leitura para usuários
CREATE POLICY "Usuarios veem relatorios do estabelecimento ou sem estabelecimento"
ON public.relatorios
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

-- Política de escrita para usuários admin/gestor
CREATE POLICY "Usuarios admin gerenciam relatorios do estabelecimento"
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

-- Administradores do sistema gerenciam tudo
CREATE POLICY "Administradores gerenciam todos relatorios"
ON public.relatorios
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);