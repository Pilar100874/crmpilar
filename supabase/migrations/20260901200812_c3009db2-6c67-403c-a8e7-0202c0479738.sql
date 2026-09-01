CREATE TABLE public.port_push_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_services_json text,
  project_id text,
  package_name text,
  app_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_push_config TO authenticated;
GRANT ALL ON public.port_push_config TO service_role;

ALTER TABLE public.port_push_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados leem config de push"
ON public.port_push_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gerenciam config de push"
ON public.port_push_config FOR ALL TO authenticated USING (true) WITH CHECK (true);