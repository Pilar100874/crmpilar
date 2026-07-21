ALTER TABLE public.tv_workflows
  ADD COLUMN IF NOT EXISTS flow_json jsonb DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;