ALTER TABLE public.ponto_equipamentos
  ADD COLUMN IF NOT EXISTS ultimo_erro text,
  ADD COLUMN IF NOT EXISTS usa_https boolean NOT NULL DEFAULT false;