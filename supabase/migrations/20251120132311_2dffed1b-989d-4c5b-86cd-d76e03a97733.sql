-- Adicionar colunas de ativo e data de validade à tabela relatorios_importacao
ALTER TABLE public.relatorios_importacao
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_validade DATE DEFAULT NULL;

-- Criar índice para melhorar performance de consultas por data de validade
CREATE INDEX IF NOT EXISTS idx_relatorios_importacao_data_validade 
ON public.relatorios_importacao(data_validade) 
WHERE data_validade IS NOT NULL;