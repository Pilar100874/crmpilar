
ALTER TABLE public.ponto_registros
  ADD COLUMN IF NOT EXISTS comprovante_gerado_em timestamptz,
  ADD COLUMN IF NOT EXISTS comprovante_hash text;

ALTER TABLE public.ponto_ferias_afastamentos
  ADD COLUMN IF NOT EXISTS abono_pecuniario_dias int NOT NULL DEFAULT 0;
