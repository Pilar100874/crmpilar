ALTER TABLE public.automacao_ambientes
  ADD COLUMN IF NOT EXISTS dispositivo text NOT NULL DEFAULT 'tv',
  ADD COLUMN IF NOT EXISTS rolagem boolean NOT NULL DEFAULT false;