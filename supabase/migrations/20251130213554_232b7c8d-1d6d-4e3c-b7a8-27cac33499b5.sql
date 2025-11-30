-- Add price adjustment fields to marketplace accounts
ALTER TABLE public.contas_marketplace
ADD COLUMN IF NOT EXISTS ajuste_preco_fixo NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ajuste_preco_percentual NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN public.contas_marketplace.ajuste_preco_fixo IS 'Valor fixo a ser adicionado ao preço dos produtos';
COMMENT ON COLUMN public.contas_marketplace.ajuste_preco_percentual IS 'Percentual de aumento no preço dos produtos';