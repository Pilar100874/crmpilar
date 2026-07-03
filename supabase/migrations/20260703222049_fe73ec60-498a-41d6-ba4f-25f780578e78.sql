
ALTER TABLE public.pilar_cam_cameras
  ADD COLUMN IF NOT EXISTS finalidade text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS obrigatoria boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS filial_id uuid NULL,
  ADD COLUMN IF NOT EXISTS empresa_ponto_id uuid NULL;

-- finalidade aceita: 'geral', 'ponto', 'motorista_face',
-- 'veiculo_frente', 'veiculo_traseira', 'veiculo_lateral_esq', 'veiculo_lateral_dir'
ALTER TABLE public.pilar_cam_cameras
  DROP CONSTRAINT IF EXISTS pilar_cam_cameras_finalidade_check;
ALTER TABLE public.pilar_cam_cameras
  ADD CONSTRAINT pilar_cam_cameras_finalidade_check
  CHECK (finalidade IN ('geral','ponto','motorista_face','veiculo_frente','veiculo_traseira','veiculo_lateral_esq','veiculo_lateral_dir'));

CREATE INDEX IF NOT EXISTS idx_pilar_cam_cameras_finalidade ON public.pilar_cam_cameras(estabelecimento_id, finalidade) WHERE ativo = true;
