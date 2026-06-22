
-- Novas colunas em ponto_registros para multi-fator antifraude
ALTER TABLE public.ponto_registros
  ADD COLUMN IF NOT EXISTS score_confianca integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fatores_validacao jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS face_match_score numeric,
  ADD COLUMN IF NOT EXISTS liveness_ok boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_ok boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rede_ok boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS device_hash text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Geofences por filial
CREATE TABLE IF NOT EXISTS public.ponto_geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE CASCADE,
  nome text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  raio_metros integer NOT NULL DEFAULT 150,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_geofences TO authenticated;
GRANT ALL ON public.ponto_geofences TO service_role;
ALTER TABLE public.ponto_geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth gerencia geofences"
  ON public.ponto_geofences FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ponto_geofences_updated
  BEFORE UPDATE ON public.ponto_geofences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redes autorizadas por filial
CREATE TABLE IF NOT EXISTS public.ponto_redes_autorizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ip','cidr','ssid')),
  valor text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_redes_autorizadas TO authenticated;
GRANT ALL ON public.ponto_redes_autorizadas TO service_role;
ALTER TABLE public.ponto_redes_autorizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth gerencia redes autorizadas"
  ON public.ponto_redes_autorizadas FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ponto_redes_updated
  BEFORE UPDATE ON public.ponto_redes_autorizadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adiciona foto_referencia em funcionários (para face match)
ALTER TABLE public.ponto_funcionarios
  ADD COLUMN IF NOT EXISTS foto_referencia_url text;
