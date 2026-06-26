ALTER TABLE public.ponto_equipamentos
  ADD COLUMN IF NOT EXISTS solicitar_teste boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resultado_teste text;