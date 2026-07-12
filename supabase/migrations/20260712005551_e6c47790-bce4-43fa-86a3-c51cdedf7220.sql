
CREATE TABLE public.ads_platform_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  meta_app_id text,
  meta_app_secret text,
  google_client_id text,
  google_client_secret text,
  google_ads_developer_token text,
  tiktok_app_id text,
  tiktok_app_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_platform_apps TO authenticated;
GRANT ALL ON public.ads_platform_apps TO service_role;

ALTER TABLE public.ads_platform_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam credenciais Ads do próprio estabelecimento"
  ON public.ads_platform_apps FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_ads_platform_apps_updated_at
  BEFORE UPDATE ON public.ads_platform_apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
