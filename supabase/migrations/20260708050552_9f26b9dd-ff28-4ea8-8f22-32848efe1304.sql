
ALTER TABLE public.doc_modelos ADD COLUMN IF NOT EXISTS merge_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.doc_gerados ADD COLUMN IF NOT EXISTS merge_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.doc_gerados ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'documento';
ALTER TABLE public.doc_gerados ADD COLUMN IF NOT EXISTS content_html text;
ALTER TABLE public.doc_gerados ADD COLUMN IF NOT EXISTS content_json jsonb;
ALTER TABLE public.doc_gerados ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.doc_gerados ALTER COLUMN modelo_id DROP NOT NULL;
