-- Status de comunicação das câmeras (preenchido pelo Coletor Desktop para câmeras internas,
-- e pelo edge cv-camera-snapshot para câmeras públicas testadas do CRM).
ALTER TABLE public.cv_cameras
  ADD COLUMN IF NOT EXISTS ultima_verificacao timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_status text,
  ADD COLUMN IF NOT EXISTS ultimo_erro text;

CREATE INDEX IF NOT EXISTS cv_cameras_ultima_verificacao_idx
  ON public.cv_cameras (ultima_verificacao DESC NULLS LAST);
