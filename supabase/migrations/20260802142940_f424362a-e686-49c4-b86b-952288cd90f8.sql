ALTER TABLE public.aip_executions
  ADD COLUMN IF NOT EXISTS cancelamento_solicitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelado_por uuid,
  ADD COLUMN IF NOT EXISTS motivo_interrupcao text;

ALTER TABLE public.aip_execution_steps
  ADD COLUMN IF NOT EXISTS motivo_interrupcao text,
  ADD COLUMN IF NOT EXISTS timeout_ms integer;