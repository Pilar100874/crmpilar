ALTER TABLE public.calendario_tarefas
  ADD COLUMN IF NOT EXISTS modo_criacao text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS motivo text;
COMMENT ON COLUMN public.calendario_tarefas.modo_criacao IS 'manual | automatico | inteligente';
CREATE INDEX IF NOT EXISTS calendario_tarefas_contato_criacao_idx ON public.calendario_tarefas (contact_id, created_at);