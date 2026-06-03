
-- =========== USAGE EVENTS (Sistema interno) ===========
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  route text NOT NULL,
  page_title text,
  duration_ms integer NOT NULL DEFAULT 0,
  idle_ms integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_estab_time ON public.usage_events (estabelecimento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_usuario_time ON public.usage_events (usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_route ON public.usage_events (estabelecimento_id, route);

GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_events_select_estab" ON public.usage_events FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "usage_events_insert_self" ON public.usage_events FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND usuario_id = public.get_current_usuario_id());

-- =========== ECOM USAGE EVENTS (Loja pública) ===========
CREATE TABLE IF NOT EXISTS public.ecom_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  session_id text NOT NULL,
  customer_id uuid,
  route text NOT NULL,
  page_title text,
  product_id uuid,
  event_type text NOT NULL DEFAULT 'pageview', -- pageview, click, add_to_cart, checkout_start, purchase
  duration_ms integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ecom_usage_estab_time ON public.ecom_usage_events (estabelecimento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecom_usage_session ON public.ecom_usage_events (session_id);
CREATE INDEX IF NOT EXISTS idx_ecom_usage_route ON public.ecom_usage_events (estabelecimento_id, route);
CREATE INDEX IF NOT EXISTS idx_ecom_usage_event_type ON public.ecom_usage_events (estabelecimento_id, event_type);

GRANT SELECT ON public.ecom_usage_events TO anon;
GRANT SELECT, INSERT ON public.ecom_usage_events TO authenticated;
GRANT INSERT ON public.ecom_usage_events TO anon;
GRANT ALL ON public.ecom_usage_events TO service_role;
ALTER TABLE public.ecom_usage_events ENABLE ROW LEVEL SECURITY;

-- Public ecommerce: anonymous can insert events
CREATE POLICY "ecom_usage_insert_anon" ON public.ecom_usage_events FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "ecom_usage_insert_auth" ON public.ecom_usage_events FOR INSERT TO authenticated
  WITH CHECK (true);
-- Only staff of the estabelecimento can read
CREATE POLICY "ecom_usage_select_estab" ON public.ecom_usage_events FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- =========== ECOM ACTIVE CARTS (snapshot, abandono) ===========
CREATE TABLE IF NOT EXISTS public.ecom_active_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  customer_id uuid,
  customer_email text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(14,2) NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active, abandoned, recovered, converted
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  recovery_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ecom_carts_estab_status ON public.ecom_active_carts (estabelecimento_id, status);
CREATE INDEX IF NOT EXISTS idx_ecom_carts_last_activity ON public.ecom_active_carts (last_activity_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.ecom_active_carts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_active_carts TO authenticated;
GRANT ALL ON public.ecom_active_carts TO service_role;
ALTER TABLE public.ecom_active_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecom_carts_anon_upsert" ON public.ecom_active_carts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ecom_carts_anon_update" ON public.ecom_active_carts FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "ecom_carts_anon_select" ON public.ecom_active_carts FOR SELECT TO anon USING (true);
CREATE POLICY "ecom_carts_auth_all" ON public.ecom_active_carts FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_ecom_carts_updated_at BEFORE UPDATE ON public.ecom_active_carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== HEATMAP TRIGGERS CONFIG ===========
CREATE TABLE IF NOT EXISTS public.heatmap_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL, -- tempo_em_tela | carrinho_abandonado
  escopo text NOT NULL DEFAULT 'sistema', -- sistema | ecommerce
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  acao jsonb NOT NULL DEFAULT '{}'::jsonb, -- {tipo: 'notificacao'|'webhook'|'email'|'whatsapp', payload: {...}}
  ativo boolean NOT NULL DEFAULT true,
  ultima_execucao_at timestamptz,
  total_disparos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_heatmap_triggers_estab ON public.heatmap_triggers (estabelecimento_id, ativo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.heatmap_triggers TO authenticated;
GRANT ALL ON public.heatmap_triggers TO service_role;
ALTER TABLE public.heatmap_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heatmap_triggers_all_estab" ON public.heatmap_triggers FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_heatmap_triggers_updated_at BEFORE UPDATE ON public.heatmap_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
