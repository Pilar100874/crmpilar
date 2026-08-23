ALTER TABLE public.port_devices ADD COLUMN IF NOT EXISTS via_coletor boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.port_coletores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ativo boolean NOT NULL DEFAULT true,
  versao text,
  ip_local text,
  ultima_comunicacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.port_coletores TO authenticated;
GRANT ALL ON public.port_coletores TO service_role;
ALTER TABLE public.port_coletores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores gerenciam coletores da portaria" ON public.port_coletores;
CREATE POLICY "Gestores gerenciam coletores da portaria"
  ON public.port_coletores FOR ALL TO authenticated
  USING (public.port_is_gestor(auth.uid())) WITH CHECK (public.port_is_gestor(auth.uid()));

CREATE TABLE IF NOT EXISTS public.port_device_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.port_devices(id) ON DELETE CASCADE,
  access_point_id uuid REFERENCES public.port_access_points(id) ON DELETE SET NULL,
  coletor_id uuid REFERENCES public.port_coletores(id) ON DELETE SET NULL,
  comando text NOT NULL,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  resultado jsonb,
  erro text,
  solicitado_por uuid,
  executado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS port_device_jobs_pendentes_idx
  ON public.port_device_jobs (status, created_at);

GRANT SELECT ON public.port_device_jobs TO authenticated;
GRANT ALL ON public.port_device_jobs TO service_role;
ALTER TABLE public.port_device_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Equipe da portaria ve a fila de comandos" ON public.port_device_jobs;
CREATE POLICY "Equipe da portaria ve a fila de comandos"
  ON public.port_device_jobs FOR SELECT TO authenticated
  USING (public.port_is_staff(auth.uid()));

DROP TRIGGER IF EXISTS port_coletores_updated_at ON public.port_coletores;
CREATE TRIGGER port_coletores_updated_at BEFORE UPDATE ON public.port_coletores
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();
DROP TRIGGER IF EXISTS port_device_jobs_updated_at ON public.port_device_jobs;
CREATE TRIGGER port_device_jobs_updated_at BEFORE UPDATE ON public.port_device_jobs
  FOR EACH ROW EXECUTE FUNCTION public.port_touch_updated_at();