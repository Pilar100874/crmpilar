ALTER TABLE public.automacao_blocos
  ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;