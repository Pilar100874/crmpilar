ALTER TABLE public.cv_cameras
  ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_cameras_filial_id ON public.cv_cameras(filial_id);