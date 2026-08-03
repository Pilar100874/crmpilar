ALTER TABLE public.logistica_config
  ADD COLUMN IF NOT EXISTS limites_velocidade_tipo jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS limite_velocidade_global integer NOT NULL DEFAULT 80;