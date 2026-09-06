ALTER TABLE public.tv_devices
  ADD COLUMN IF NOT EXISTS split_paineis integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS split_proporcao_b integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS split_c_dashboard_id uuid REFERENCES public.tv_dashboards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS split_c_playlist_id uuid REFERENCES public.tv_playlists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS split_zoom_c integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS split_b_visivel_modo text NOT NULL DEFAULT 'sempre',
  ADD COLUMN IF NOT EXISTS split_b_intervalo_segundos integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS split_b_duracao_segundos integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS split_c_visivel_modo text NOT NULL DEFAULT 'sempre',
  ADD COLUMN IF NOT EXISTS split_c_intervalo_segundos integer NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS split_c_duracao_segundos integer NOT NULL DEFAULT 30;

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_paineis_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_paineis_check CHECK (split_paineis IN (2,3));

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_proporcao_b_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_proporcao_b_check CHECK (split_proporcao_b BETWEEN 5 AND 90);

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_zoom_c_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_zoom_c_check CHECK (split_zoom_c BETWEEN 25 AND 200);

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_b_visivel_modo_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_b_visivel_modo_check CHECK (split_b_visivel_modo IN ('sempre','intervalo'));

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_c_visivel_modo_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_c_visivel_modo_check CHECK (split_c_visivel_modo IN ('sempre','intervalo'));

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_b_intervalo_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_b_intervalo_check CHECK (split_b_intervalo_segundos BETWEEN 10 AND 86400 AND split_b_duracao_segundos BETWEEN 5 AND 86400);

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_c_intervalo_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_c_intervalo_check CHECK (split_c_intervalo_segundos BETWEEN 10 AND 86400 AND split_c_duracao_segundos BETWEEN 5 AND 86400);