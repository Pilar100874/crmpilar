ALTER TABLE public.aip_execution_steps
  ADD COLUMN IF NOT EXISTS tentativa integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tentativas_max integer NOT NULL DEFAULT 1;

ALTER TABLE public.aip_executions
  ADD COLUMN IF NOT EXISTS retentativas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retomado_de_node_id text;