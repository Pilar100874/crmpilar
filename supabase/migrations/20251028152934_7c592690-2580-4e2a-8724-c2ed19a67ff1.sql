-- Remover todas as políticas existentes e criar políticas simples e permissivas

-- UNIDADES
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'unidades' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.unidades';
    END LOOP;
END $$;

CREATE POLICY "unidades_auth_all"
ON public.unidades FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- CANAIS_ATENDIMENTO
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'canais_atendimento' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.canais_atendimento';
    END LOOP;
END $$;

CREATE POLICY "canais_atendimento_auth_all"
ON public.canais_atendimento FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- GRUPOS_ACESSO
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'grupos_acesso' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.grupos_acesso';
    END LOOP;
END $$;

CREATE POLICY "grupos_acesso_auth_all"
ON public.grupos_acesso FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- NOTIFICACOES_CONFIG
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'notificacoes_config' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.notificacoes_config';
    END LOOP;
END $$;

CREATE POLICY "notificacoes_config_auth_all"
ON public.notificacoes_config FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- REDES_SOCIAIS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'redes_sociais' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.redes_sociais';
    END LOOP;
END $$;

CREATE POLICY "redes_sociais_auth_all"
ON public.redes_sociais FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- SEGMENTOS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'segmentos' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.segmentos';
    END LOOP;
END $$;

CREATE POLICY "segmentos_auth_all"
ON public.segmentos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- QUICK_REPLIES
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'quick_replies' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.quick_replies';
    END LOOP;
END $$;

CREATE POLICY "quick_replies_auth_all"
ON public.quick_replies FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- QUICK_ATTACHMENTS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'quick_attachments' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.quick_attachments';
    END LOOP;
END $$;

CREATE POLICY "quick_attachments_auth_all"
ON public.quick_attachments FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- CUSTOMERS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.customers';
    END LOOP;
END $$;

CREATE POLICY "customers_auth_all"
ON public.customers FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- SEGURANCA_CONFIG
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'seguranca_config' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.seguranca_config';
    END LOOP;
END $$;

CREATE POLICY "seguranca_config_auth_all"
ON public.seguranca_config FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- WEBHOOKS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'webhooks' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.webhooks';
    END LOOP;
END $$;

CREATE POLICY "webhooks_auth_all"
ON public.webhooks FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- API_ENDPOINTS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'api_endpoints' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.api_endpoints';
    END LOOP;
END $$;

CREATE POLICY "api_endpoints_auth_all"
ON public.api_endpoints FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- CAMPAIGNS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'campaigns' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.campaigns';
    END LOOP;
END $$;

CREATE POLICY "campaigns_auth_all"
ON public.campaigns FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- CONTENTS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'contents' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.contents';
    END LOOP;
END $$;

CREATE POLICY "contents_auth_all"
ON public.contents FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- DATABASE_CONNECTIONS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'database_connections' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.database_connections';
    END LOOP;
END $$;

CREATE POLICY "database_connections_auth_all"
ON public.database_connections FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- FLOWS
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'flows' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.flows';
    END LOOP;
END $$;

CREATE POLICY "flows_auth_all"
ON public.flows FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- TABELAS_PRECO
DO $$ 
DECLARE pol record;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'tabelas_preco' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.tabelas_preco';
    END LOOP;
END $$;

CREATE POLICY "tabelas_preco_auth_all"
ON public.tabelas_preco FOR ALL TO authenticated
USING (true) WITH CHECK (true);