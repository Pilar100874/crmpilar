ALTER TABLE public.aip_rotinas
  ADD COLUMN IF NOT EXISTS max_concorrencia integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retry_backoff_ms integer NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS retry_fator numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS bloquear_duplicados boolean NOT NULL DEFAULT true;

ALTER TABLE public.aip_rotina_runs
  ADD COLUMN IF NOT EXISTS tentativa integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS motivo_bloqueio text,
  ADD COLUMN IF NOT EXISTS chave_minuto text;

CREATE UNIQUE INDEX IF NOT EXISTS aip_rotina_runs_chave_minuto_uidx
  ON public.aip_rotina_runs (rotina_id, chave_minuto)
  WHERE chave_minuto IS NOT NULL;

CREATE INDEX IF NOT EXISTS aip_rotina_runs_exec_idx
  ON public.aip_rotina_runs (rotina_id, status);