ALTER TABLE public.chat_agents 
ADD COLUMN IF NOT EXISTS api_endpoint_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS solicitar_cnpj boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gerar_pre_orcamento boolean DEFAULT false;