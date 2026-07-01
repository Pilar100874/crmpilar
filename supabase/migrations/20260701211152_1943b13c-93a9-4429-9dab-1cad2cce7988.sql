-- Câmeras IP do Controle de Veículos
CREATE TABLE public.cv_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca TEXT NOT NULL CHECK (marca IN ('tplink_tapo','hikvision','intelbras','generica_http','generica_rtsp')),
  tipo_rede TEXT NOT NULL DEFAULT 'interna' CHECK (tipo_rede IN ('publica','interna')),
  host TEXT NOT NULL,
  porta INTEGER,
  protocolo TEXT NOT NULL DEFAULT 'http' CHECK (protocolo IN ('http','https','rtsp')),
  usuario TEXT,
  senha TEXT,
  snapshot_path TEXT,
  angulo_key TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.cv_vehicles(id) ON DELETE SET NULL,
  local_descricao TEXT,
  coletor_id TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_cameras TO authenticated;
GRANT ALL ON public.cv_cameras TO service_role;

ALTER TABLE public.cv_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_cameras_authenticated_all" ON public.cv_cameras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cv_cameras_updated_at
  BEFORE UPDATE ON public.cv_cameras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flag global do módulo Coletor Câmeras (reaproveita coletor do Ponto)
CREATE TABLE IF NOT EXISTS public.cv_coletor_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cameras_habilitado BOOLEAN NOT NULL DEFAULT FALSE,
  intervalo_poll_segundos INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_coletor_config TO authenticated;
GRANT ALL ON public.cv_coletor_config TO service_role;

ALTER TABLE public.cv_coletor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_coletor_config_auth_all" ON public.cv_coletor_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cv_coletor_config_updated_at
  BEFORE UPDATE ON public.cv_coletor_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cv_coletor_config (cameras_habilitado) VALUES (FALSE);

-- Flag no Ponto (adiciona coluna se não existir)
ALTER TABLE public.ponto_empresas
  ADD COLUMN IF NOT EXISTS coletor_cameras_habilitado BOOLEAN NOT NULL DEFAULT FALSE;
