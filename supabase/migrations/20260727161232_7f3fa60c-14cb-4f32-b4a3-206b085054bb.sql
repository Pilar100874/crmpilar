ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS evolution_mode text NOT NULL DEFAULT 'producao'
    CHECK (evolution_mode IN ('producao','sandbox'));