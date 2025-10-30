-- Adicionar campos para variáveis de entrada na tabela webhooks
ALTER TABLE public.webhooks 
ADD COLUMN IF NOT EXISTS has_input_variables BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS input_variables JSONB DEFAULT '[]'::jsonb;