ALTER TABLE public.app_update_commands ALTER COLUMN release_id DROP NOT NULL;
ALTER TABLE public.app_update_commands ADD COLUMN IF NOT EXISTS arquivo_url text;