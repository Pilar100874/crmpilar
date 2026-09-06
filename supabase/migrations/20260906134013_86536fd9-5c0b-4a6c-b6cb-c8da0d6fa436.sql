ALTER TABLE public.tv_devices
  ADD COLUMN IF NOT EXISTS split_zoom_a integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS split_zoom_b integer NOT NULL DEFAULT 100;

ALTER TABLE public.tv_devices
  DROP CONSTRAINT IF EXISTS tv_devices_split_zoom_check;

ALTER TABLE public.tv_devices
  ADD CONSTRAINT tv_devices_split_zoom_check
  CHECK (split_zoom_a BETWEEN 25 AND 200 AND split_zoom_b BETWEEN 25 AND 200);