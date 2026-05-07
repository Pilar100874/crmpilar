
-- =============================================
-- FIX 1: customers - Remove overly permissive policies
-- The proper estabelecimento-scoped policies already exist
-- =============================================
DROP POLICY IF EXISTS "Simple policy for customers" ON public.customers;
DROP POLICY IF EXISTS "customers_auth_all" ON public.customers;

-- =============================================
-- FIX 2: email_oauth_tokens - Restrict service role policy to service_role only
-- =============================================
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_oauth_tokens;
CREATE POLICY "Service role can manage tokens"
  ON public.email_oauth_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix the user view policy to apply to authenticated only
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.email_oauth_tokens;
CREATE POLICY "Users can view their own tokens"
  ON public.email_oauth_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- FIX 3: pedido_tracking - Fix anonymous access policy to actually check token
-- =============================================
DROP POLICY IF EXISTS "Public can view by token" ON public.pedido_tracking;
-- Remove unrestricted anon read. Tracking is done via edge function or authenticated access.

-- =============================================
-- FIX 4: veiculos - Remove public read-all policy
-- The estabelecimento-scoped policy already provides proper access
-- =============================================
DROP POLICY IF EXISTS "Veículos leitura pública para watch" ON public.veiculos;

-- =============================================
-- FIX 5: whatsapp_config - Remove overly permissive authenticated policies
-- Scoped policies (whatsapp_config_select_policy, etc.) already exist
-- =============================================
DROP POLICY IF EXISTS "Allow authenticated users to read whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Allow authenticated users to update whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Allow authenticated users to insert whatsapp config" ON public.whatsapp_config;

-- =============================================
-- FIX 6: Fix functions missing search_path
-- =============================================
CREATE OR REPLACE FUNCTION public.update_produtos_importados_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_licitacoes_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_automacoes_vendas_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_relatorio_jobs_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_orcamento_conjuntos_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN new.updated_at = now(); return new; END; $$;

CREATE OR REPLACE FUNCTION public.update_kb_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.update_ia_config_updated_at()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
