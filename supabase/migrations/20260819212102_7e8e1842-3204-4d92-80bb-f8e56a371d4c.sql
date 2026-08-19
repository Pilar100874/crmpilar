ALTER TABLE public.logistica_paradas_marcadas
  ADD COLUMN IF NOT EXISTS mostrar_endereco boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endereco text;