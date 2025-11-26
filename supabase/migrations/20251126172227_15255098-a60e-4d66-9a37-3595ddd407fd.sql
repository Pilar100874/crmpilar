-- Adicionar campo de configuração de automação de vendas na tabela estabelecimentos
ALTER TABLE public.estabelecimentos 
ADD COLUMN IF NOT EXISTS automacao_vendas_config JSONB DEFAULT '{
  "nao_acumular_descontos": false
}'::jsonb;