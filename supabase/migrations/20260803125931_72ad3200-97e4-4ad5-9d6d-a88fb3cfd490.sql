ALTER TABLE public.logistica_paradas_marcadas
  ADD COLUMN IF NOT EXISTS mostrar_tempo boolean NOT NULL DEFAULT false;