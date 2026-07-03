
ALTER TABLE public.sms_devices
  ADD COLUMN IF NOT EXISTS tipo_dispositivo text NOT NULL DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS versao_app text,
  ADD COLUMN IF NOT EXISTS modulo_sms_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS modulo_ponto_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modulo_camera_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ponto_config jsonb NOT NULL DEFAULT '{"modo":"pin","exigir_foto":true,"exigir_gps":true,"camera":"frontal","cerca":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS camera_config jsonb NOT NULL DEFAULT '{"qualidade":"media","guardar_local":true,"dias_local":7}'::jsonb,
  ADD COLUMN IF NOT EXISTS ultimo_heartbeat timestamptz;

CREATE TABLE IF NOT EXISTS public.pilar_hub_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.sms_devices(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'ponto',
  referencia_id uuid,
  storage_path text NOT NULL,
  url_publica text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilar_hub_snapshots_estab ON public.pilar_hub_snapshots(estabelecimento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilar_hub_snapshots_device ON public.pilar_hub_snapshots(device_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilar_hub_snapshots TO authenticated;
GRANT ALL ON public.pilar_hub_snapshots TO service_role;

ALTER TABLE public.pilar_hub_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_snapshots" ON public.pilar_hub_snapshots;
CREATE POLICY "authenticated_read_snapshots"
  ON public.pilar_hub_snapshots FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_manage_snapshots" ON public.pilar_hub_snapshots;
CREATE POLICY "service_role_manage_snapshots"
  ON public.pilar_hub_snapshots FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_snapshots" ON public.pilar_hub_snapshots;
CREATE POLICY "authenticated_delete_snapshots"
  ON public.pilar_hub_snapshots FOR DELETE
  TO authenticated USING (true);
