
ALTER TABLE public.ponto_espelho_diario
  ADD COLUMN IF NOT EXISTS noturno_min_reduzido int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dsr_min int DEFAULT 0;
