
-- Câmeras vinculadas a dispositivos Windows (Pilar Cam)
CREATE TABLE public.pilar_cam_cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.sms_devices(id) ON DELETE CASCADE,
  estabelecimento_id uuid,
  nome text NOT NULL,
  rtsp_url text NOT NULL,
  usuario text,
  senha text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilar_cam_cameras TO authenticated;
GRANT ALL ON public.pilar_cam_cameras TO service_role;

ALTER TABLE public.pilar_cam_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam cameras do seu estabelecimento"
  ON public.pilar_cam_cameras FOR ALL TO authenticated
  USING (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id());

CREATE INDEX idx_pilar_cam_cameras_device ON public.pilar_cam_cameras(device_id);

CREATE TRIGGER trg_pilar_cam_cameras_updated_at
  BEFORE UPDATE ON public.pilar_cam_cameras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
