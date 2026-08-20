ALTER TABLE public.logistica_paradas_marcadas
  DROP CONSTRAINT IF EXISTS logistica_paradas_marcadas_categoria_tempo_check;
ALTER TABLE public.logistica_paradas_marcadas
  ADD CONSTRAINT logistica_paradas_marcadas_categoria_tempo_check
  CHECK (categoria_tempo::text = ANY (ARRAY['menos_5','5_15','10_20','15_30','21_30','mais_30']));