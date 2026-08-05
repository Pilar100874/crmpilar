ALTER TABLE public.cv_movement_photos
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false;