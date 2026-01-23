-- Adicionar coluna de timeout_seconds na tabela licitacoes_fontes
ALTER TABLE public.licitacoes_fontes ADD COLUMN IF NOT EXISTS timeout_seconds integer DEFAULT 15;

-- Comentário explicativo
COMMENT ON COLUMN public.licitacoes_fontes.timeout_seconds IS 'Tempo limite em segundos para requisições à API desta fonte';