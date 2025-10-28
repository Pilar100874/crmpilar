-- Remover todas as políticas existentes e criar políticas simples
-- UNIDADES
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.unidades;
DROP POLICY IF EXISTS "Manage unidades (same estab admin/gestor or admin)" ON public.unidades;
DROP POLICY IF EXISTS "Insert unidades (same estab via email)" ON public.unidades;
DROP POLICY IF EXISTS "View unidades (same estab or admin)" ON public.unidades;

CREATE POLICY "Simple policy for unidades"
ON public.unidades
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CANAIS_ATENDIMENTO
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.canais_atendimento;
DROP POLICY IF EXISTS "Manage canais atendimento (admin/gestor or admin)" ON public.canais_atendimento;
DROP POLICY IF EXISTS "View canais atendimento (same estab or admin)" ON public.canais_atendimento;

CREATE POLICY "Simple policy for canais_atendimento"
ON public.canais_atendimento
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- GRUPOS_ACESSO
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Manage grupos acesso (admin/gestor or admin)" ON public.grupos_acesso;
DROP POLICY IF EXISTS "View grupos acesso (same estab or admin)" ON public.grupos_acesso;

CREATE POLICY "Simple policy for grupos_acesso"
ON public.grupos_acesso
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- NOTIFICACOES_CONFIG
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.notificacoes_config;
DROP POLICY IF EXISTS "Manage notificacoes config (admin/gestor or admin)" ON public.notificacoes_config;
DROP POLICY IF EXISTS "View notificacoes config (same estab or admin)" ON public.notificacoes_config;

CREATE POLICY "Simple policy for notificacoes_config"
ON public.notificacoes_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- REDES_SOCIAIS
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.redes_sociais;
DROP POLICY IF EXISTS "Manage redes sociais (same estab admin/gestor or admin)" ON public.redes_sociais;
DROP POLICY IF EXISTS "View redes sociais (same estab or admin)" ON public.redes_sociais;

CREATE POLICY "Simple policy for redes_sociais"
ON public.redes_sociais
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- SEGMENTOS
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.segmentos;
DROP POLICY IF EXISTS "Manage segmentos (admin/gestor or admin)" ON public.segmentos;
DROP POLICY IF EXISTS "View segmentos (same estab or admin)" ON public.segmentos;

CREATE POLICY "Simple policy for segmentos"
ON public.segmentos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- QUICK_REPLIES
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.quick_replies;
DROP POLICY IF EXISTS "Manage quick replies (admin/gestor or own)" ON public.quick_replies;
DROP POLICY IF EXISTS "View quick replies (same estab or admin)" ON public.quick_replies;

CREATE POLICY "Simple policy for quick_replies"
ON public.quick_replies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- QUICK_ATTACHMENTS
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.quick_attachments;
DROP POLICY IF EXISTS "Manage global quick attachments (admin/gestor)" ON public.quick_attachments;
DROP POLICY IF EXISTS "View quick attachments (same estab or admin)" ON public.quick_attachments;

CREATE POLICY "Simple policy for quick_attachments"
ON public.quick_attachments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- CUSTOMERS
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Manage customers (same estab admin/gestor or admin)" ON public.customers;
DROP POLICY IF EXISTS "View customers (same estab or admin)" ON public.customers;

CREATE POLICY "Simple policy for customers"
ON public.customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- SEGURANCA_CONFIG
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.seguranca_config;
DROP POLICY IF EXISTS "Manage seguranca config (admin/gestor or admin)" ON public.seguranca_config;
DROP POLICY IF EXISTS "View seguranca config (same estab or admin)" ON public.seguranca_config;

CREATE POLICY "Simple policy for seguranca_config"
ON public.seguranca_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- WEBHOOKS
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.webhooks;
DROP POLICY IF EXISTS "Manage webhooks (init or same estab)" ON public.webhooks;
DROP POLICY IF EXISTS "Users can view webhooks from same estabelecimento" ON public.webhooks;

CREATE POLICY "Simple policy for webhooks"
ON public.webhooks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);