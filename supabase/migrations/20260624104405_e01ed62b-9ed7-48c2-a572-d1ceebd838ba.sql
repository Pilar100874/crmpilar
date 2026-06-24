
ALTER TABLE public.ponto_espelho_diario
  ADD COLUMN IF NOT EXISTS tipo_dia TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS abono_min INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atestado_id UUID,
  ADD COLUMN IF NOT EXISTS afastamento_id UUID;
