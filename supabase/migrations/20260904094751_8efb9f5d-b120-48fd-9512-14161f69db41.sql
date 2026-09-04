ALTER TABLE public.tv_devices
  ADD COLUMN IF NOT EXISTS split_modo text NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS split_proporcao integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS split_b_dashboard_id uuid REFERENCES public.tv_dashboards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS split_b_playlist_id uuid REFERENCES public.tv_playlists(id) ON DELETE SET NULL;

ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_modo_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_modo_check CHECK (split_modo IN ('nenhum','horizontal','vertical'));
ALTER TABLE public.tv_devices DROP CONSTRAINT IF EXISTS tv_devices_split_proporcao_check;
ALTER TABLE public.tv_devices ADD CONSTRAINT tv_devices_split_proporcao_check CHECK (split_proporcao BETWEEN 20 AND 80);