-- Nova lógica de permissões do sistema
-- 1) Administradores (tabela administradores): apenas criar estabelecimentos e editar empresas
-- 2) Usuários com flag admin: acesso total ao seu estabelecimento, exceto campos restritos
-- 3) Usuários admin veem dados criados por administradores do sistema

-- ============================================
-- ESTABELECIMENTOS: Administradores criam, usuários admin veem/editam (campos limitados)
-- ============================================

-- Remover políticas antigas de estabelecimentos
DROP POLICY IF EXISTS "Admin email can manage estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Admins table can manage estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Users can view their estabelecimento" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Usuários podem ver estabelecimentos" ON public.estabelecimentos;

-- Administradores podem criar novos estabelecimentos
CREATE POLICY "Administradores podem criar estabelecimentos"
ON public.estabelecimentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- Administradores podem ver e editar todos estabelecimentos
CREATE POLICY "Administradores podem ver todos estabelecimentos"
ON public.estabelecimentos
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

CREATE POLICY "Administradores podem editar todos estabelecimentos"
ON public.estabelecimentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- Usuários com role admin veem apenas seu estabelecimento
CREATE POLICY "Usuarios admin veem seu estabelecimento"
ON public.estabelecimentos
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR NOT roles_present()
);

-- Usuários com role admin NÃO podem modificar campos críticos
-- (essa validação será feita no frontend e na aplicação)

-- ============================================
-- EMPRESAS: Administradores editam todas, usuários admin veem do seu estabelecimento
-- ============================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.empresas;
DROP POLICY IF EXISTS "Authenticated users can delete empresas" ON public.empresas;

-- Administradores podem ver e editar todas empresas
CREATE POLICY "Administradores podem ver todas empresas"
ON public.empresas
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

CREATE POLICY "Administradores podem editar todas empresas"
ON public.empresas
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- Usuários admin veem empresas do seu estabelecimento
CREATE POLICY "Usuarios admin veem empresas do estabelecimento"
ON public.empresas
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

-- Usuários admin podem gerenciar empresas do seu estabelecimento
CREATE POLICY "Usuarios admin gerenciam empresas do estabelecimento"
ON public.empresas
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  AND (has_role(auth.uid(), 'admin'::app_role) OR NOT roles_present())
);

-- ============================================
-- BOT_FLOWS: Usuários admin veem do seu estabelecimento + criados por administradores
-- ============================================

DROP POLICY IF EXISTS "View bot flows (admin email or same estab)" ON public.bot_flows;

CREATE POLICY "Usuarios admin veem bots do estabelecimento ou sem estabelecimento"
ON public.bot_flows
FOR SELECT
TO authenticated
USING (
  -- Do próprio estabelecimento
  estabelecimento_id IN (
    SELECT estabelecimento_id 
    FROM usuarios 
    WHERE auth_user_id = auth.uid()
  )
  -- Ou criados por administradores (sem estabelecimento)
  OR estabelecimento_id IS NULL
  OR NOT roles_present()
);

-- Administradores veem todos
CREATE POLICY "Administradores veem todos bots"
ON public.bot_flows
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- Manter políticas de escrita existentes
CREATE POLICY "Usuarios podem gerenciar bots do estabelecimento"
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
);

-- ============================================
-- RELATORIOS: Mesma lógica de bot_flows
-- ============================================

DROP POLICY IF EXISTS "View relatorios (admin email or same estab)" ON public.relatorios;

CREATE POLICY "Usuarios admin veem relatorios do estabelecimento ou sem estabelecimento"
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

CREATE POLICY "Administradores veem todos relatorios"
ON public.relatorios
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- ============================================
-- OMNICHANNEL_FLOWS: Mesma lógica
-- ============================================

DROP POLICY IF EXISTS "Usuarios autenticados podem ver flows de seu estabelecimento" ON public.omnichannel_flows;

CREATE POLICY "Usuarios admin veem flows do estabelecimento ou sem estabelecimento"
ON public.omnichannel_flows
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

CREATE POLICY "Administradores veem todos flows"
ON public.omnichannel_flows
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- ============================================
-- SKILLS: Mesma lógica
-- ============================================

DROP POLICY IF EXISTS "Usuários podem ver skills" ON public.skills;

CREATE POLICY "Usuarios admin veem skills do estabelecimento ou sem estabelecimento"
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

CREATE POLICY "Administradores veem todas skills"
ON public.skills
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);

-- ============================================
-- RELATORIOS_IMPORTACAO: Mesma lógica
-- ============================================

DROP POLICY IF EXISTS "Users can view reports from their establishment" ON public.relatorios_importacao;
DROP POLICY IF EXISTS "Usuários podem visualizar relatórios do seu estabelecimento" ON public.relatorios_importacao;

CREATE POLICY "Usuarios admin veem importacoes do estabelecimento ou sem estabelecimento"
ON public.relatorios_importacao
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

CREATE POLICY "Administradores veem todas importacoes"
ON public.relatorios_importacao
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
);