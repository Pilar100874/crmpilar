-- Adicionar coluna trigger_bot_id na tabela omnichannel_flows
ALTER TABLE public.omnichannel_flows 
ADD COLUMN IF NOT EXISTS trigger_bot_id UUID REFERENCES public.bot_flows(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_omnichannel_flows_trigger_bot 
ON public.omnichannel_flows(trigger_bot_id) 
WHERE trigger_bot_id IS NOT NULL;