-- Adicionar coluna source na tabela licitacoes_runs
ALTER TABLE public.licitacoes_runs ADD COLUMN IF NOT EXISTS source text;

-- Criar índice para consultas por source
CREATE INDEX IF NOT EXISTS idx_licitacoes_runs_source ON public.licitacoes_runs(source);