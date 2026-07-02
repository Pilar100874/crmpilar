
-- Métodos permitidos por funcionário e vínculo N:N com geofences (múltiplos endereços)
CREATE TABLE IF NOT EXISTS public.ponto_funcionario_metodos (
  funcionario_id uuid PRIMARY KEY REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  permite_app boolean NOT NULL DEFAULT true,
  permite_web boolean NOT NULL DEFAULT true,
  permite_kiosk boolean NOT NULL DEFAULT true,
  permite_catraca boolean NOT NULL DEFAULT true,
  permite_qr boolean NOT NULL DEFAULT true,
  permite_offline boolean NOT NULL DEFAULT false,
  exige_face boolean NOT NULL DEFAULT false,
  exige_gps boolean NOT NULL DEFAULT true,
  exige_rede_autorizada boolean NOT NULL DEFAULT false,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_metodos TO authenticated;
GRANT ALL ON public.ponto_funcionario_metodos TO service_role;
ALTER TABLE public.ponto_funcionario_metodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metodos auth all" ON public.ponto_funcionario_metodos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ponto_funcionario_metodos_updated
  BEFORE UPDATE ON public.ponto_funcionario_metodos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ponto_funcionario_geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  geofence_id uuid NOT NULL REFERENCES public.ponto_geofences(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, geofence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_geofences TO authenticated;
GRANT ALL ON public.ponto_funcionario_geofences TO service_role;
ALTER TABLE public.ponto_funcionario_geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "func_geo auth all" ON public.ponto_funcionario_geofences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ponto_func_geo_func ON public.ponto_funcionario_geofences(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_ponto_func_geo_geo ON public.ponto_funcionario_geofences(geofence_id);
