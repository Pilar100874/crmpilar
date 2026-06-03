
CREATE TABLE IF NOT EXISTS public.heatmap_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('sistema','ecommerce')),
  enabled boolean NOT NULL DEFAULT true,
  track_click boolean NOT NULL DEFAULT true,
  track_move boolean NOT NULL DEFAULT true,
  track_scroll boolean NOT NULL DEFAULT true,
  track_rage_click boolean NOT NULL DEFAULT true,
  track_dead_click boolean NOT NULL DEFAULT true,
  track_quick_back boolean NOT NULL DEFAULT true,
  track_form_field boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, scope)
);

GRANT SELECT ON public.heatmap_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heatmap_config TO authenticated;
GRANT ALL ON public.heatmap_config TO service_role;

ALTER TABLE public.heatmap_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read heatmap_config"
  ON public.heatmap_config FOR SELECT TO anon USING (true);

CREATE POLICY "auth read heatmap_config of estab"
  ON public.heatmap_config FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "auth manage heatmap_config of estab"
  ON public.heatmap_config FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_heatmap_config_updated_at
  BEFORE UPDATE ON public.heatmap_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
