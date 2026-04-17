ALTER TABLE public.agent_knowledge_bases 
ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_agent_kb_origem ON public.agent_knowledge_bases(estabelecimento_id, origem);

COMMENT ON COLUMN public.agent_knowledge_bases.origem IS 'Origem da entrada: manual (criada pelo usuário), lacuna (aprovada via Lacunas da Base), importada (importação em massa)';