-- Adicionar coluna bot_id para vincular bots aos webhooks de entrada
ALTER TABLE public.webhooks_entrada
ADD COLUMN bot_id UUID REFERENCES public.bot_flows(id) ON DELETE SET NULL;

-- Adicionar índice para melhorar performance
CREATE INDEX idx_webhooks_entrada_bot ON public.webhooks_entrada(bot_id);