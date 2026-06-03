
-- ============ INTERACTION EVENTS (raw, 30d retention) ============
CREATE TABLE IF NOT EXISTS public.interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'sistema', -- sistema | ecommerce
  session_id text NOT NULL,
  usuario_id uuid,
  route text NOT NULL,
  event_type text NOT NULL, -- click | move | scroll | rage_click | dead_click | quick_back | form_field
  x integer,
  y integer,
  vw integer,
  vh integer,
  scroll_depth integer, -- % máximo de scroll na página
  element_selector text,
  element_text text,
  device text, -- desktop | tablet | mobile
  browser text,
  country text,
  referrer text,
  is_new_visitor boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inter_events_estab_time ON public.interaction_events (estabelecimento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inter_events_route ON public.interaction_events (estabelecimento_id, route, event_type);
CREATE INDEX IF NOT EXISTS idx_inter_events_session ON public.interaction_events (session_id);
CREATE INDEX IF NOT EXISTS idx_inter_events_scope_type ON public.interaction_events (estabelecimento_id, scope, event_type, created_at DESC);

GRANT SELECT, INSERT ON public.interaction_events TO authenticated;
GRANT INSERT ON public.interaction_events TO anon;
GRANT ALL ON public.interaction_events TO service_role;
ALTER TABLE public.interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inter_events_insert_anon_ecom" ON public.interaction_events FOR INSERT TO anon
  WITH CHECK (scope = 'ecommerce');
CREATE POLICY "inter_events_insert_auth" ON public.interaction_events FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "inter_events_select_estab" ON public.interaction_events FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- ============ DAILY AGGREGATES (1y retention) ============
CREATE TABLE IF NOT EXISTS public.interaction_aggregates_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  scope text NOT NULL,
  day date NOT NULL,
  route text NOT NULL,
  device text NOT NULL DEFAULT 'all',
  event_type text NOT NULL,
  total_count integer NOT NULL DEFAULT 0,
  unique_sessions integer NOT NULL DEFAULT 0,
  avg_scroll_depth numeric(5,2),
  rage_count integer NOT NULL DEFAULT 0,
  dead_count integer NOT NULL DEFAULT 0,
  quick_back_count integer NOT NULL DEFAULT 0,
  grid_data jsonb DEFAULT '{}'::jsonb, -- buckets x,y agregados
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, scope, day, route, device, event_type)
);

CREATE INDEX IF NOT EXISTS idx_inter_agg_estab_day ON public.interaction_aggregates_daily (estabelecimento_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_inter_agg_route ON public.interaction_aggregates_daily (estabelecimento_id, route, day DESC);

GRANT SELECT ON public.interaction_aggregates_daily TO authenticated;
GRANT ALL ON public.interaction_aggregates_daily TO service_role;
ALTER TABLE public.interaction_aggregates_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inter_agg_select_estab" ON public.interaction_aggregates_daily FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- ============ AGGREGATE + PURGE FUNCTION ============
CREATE OR REPLACE FUNCTION public.aggregate_heatmap_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_day date;
BEGIN
  -- Agrega o dia anterior
  target_day := (now() - interval '1 day')::date;

  INSERT INTO public.interaction_aggregates_daily (
    estabelecimento_id, scope, day, route, device, event_type,
    total_count, unique_sessions, avg_scroll_depth, rage_count, dead_count, quick_back_count, grid_data
  )
  SELECT
    estabelecimento_id,
    scope,
    target_day,
    route,
    COALESCE(device, 'unknown') as device,
    event_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(scroll_depth) FILTER (WHERE event_type = 'scroll') as avg_scroll_depth,
    COUNT(*) FILTER (WHERE event_type = 'rage_click') as rage_count,
    COUNT(*) FILTER (WHERE event_type = 'dead_click') as dead_count,
    COUNT(*) FILTER (WHERE event_type = 'quick_back') as quick_back_count,
    jsonb_object_agg(
      (COALESCE((x / 20)::text, '0') || '_' || COALESCE((y / 20)::text, '0')),
      cnt
    ) FILTER (WHERE x IS NOT NULL AND y IS NOT NULL)
  FROM (
    SELECT
      estabelecimento_id, scope, route, device, event_type, session_id, scroll_depth, x, y,
      COUNT(*) OVER (
        PARTITION BY estabelecimento_id, scope, route, COALESCE(device,'unknown'), event_type, (x/20), (y/20)
      ) as cnt
    FROM public.interaction_events
    WHERE created_at::date = target_day
  ) e
  GROUP BY estabelecimento_id, scope, route, COALESCE(device,'unknown'), event_type
  ON CONFLICT (estabelecimento_id, scope, day, route, device, event_type) DO UPDATE
    SET total_count = EXCLUDED.total_count,
        unique_sessions = EXCLUDED.unique_sessions,
        avg_scroll_depth = EXCLUDED.avg_scroll_depth,
        rage_count = EXCLUDED.rage_count,
        dead_count = EXCLUDED.dead_count,
        quick_back_count = EXCLUDED.quick_back_count,
        grid_data = EXCLUDED.grid_data;

  -- Purga eventos brutos > 30 dias
  DELETE FROM public.interaction_events WHERE created_at < now() - interval '30 days';
  -- Purga agregados > 1 ano
  DELETE FROM public.interaction_aggregates_daily WHERE day < (now() - interval '365 days')::date;
END;
$$;
