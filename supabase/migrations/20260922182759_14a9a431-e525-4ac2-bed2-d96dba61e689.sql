ALTER TABLE public.ucm_config
  ADD COLUMN IF NOT EXISTS discagem_regras_ativas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discagem_ddd_local text DEFAULT '11',
  ADD COLUMN IF NOT EXISTS discagem_prefixo_outro_ddd text DEFAULT '015';