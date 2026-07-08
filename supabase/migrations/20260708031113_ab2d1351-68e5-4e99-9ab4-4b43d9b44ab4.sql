
ALTER TABLE public.cv_cameras
  ADD COLUMN IF NOT EXISTS modo_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rtsp_porta integer,
  ADD COLUMN IF NOT EXISTS rtsp_path text,
  ADD COLUMN IF NOT EXISTS rtsp_user text,
  ADD COLUMN IF NOT EXISTS rtsp_pass text,
  ADD COLUMN IF NOT EXISTS rtsp_transporte text;
