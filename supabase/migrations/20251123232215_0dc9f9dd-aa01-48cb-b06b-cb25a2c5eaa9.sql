-- Adicionar campo is_default na tabela omnichannel_flows
ALTER TABLE public.omnichannel_flows
ADD COLUMN is_default boolean DEFAULT false;

-- Criar índice parcial para garantir apenas um workflow padrão por estabelecimento
CREATE UNIQUE INDEX idx_omnichannel_flows_default_per_estabelecimento 
ON public.omnichannel_flows (estabelecimento_id) 
WHERE is_default = true;

-- Comentários para documentação
COMMENT ON COLUMN public.omnichannel_flows.is_default IS 'Define se este workflow é o padrão para o estabelecimento quando nenhum outro workflow atende aos critérios de roteamento';
COMMENT ON INDEX idx_omnichannel_flows_default_per_estabelecimento IS 'Garante que apenas um workflow pode ser marcado como padrão por estabelecimento';