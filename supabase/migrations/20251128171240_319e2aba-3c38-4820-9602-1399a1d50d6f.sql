-- Adicionar campo para tipo de cálculo de peso no frete
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS peso_frete_tipo text DEFAULT 'fixo';

COMMENT ON COLUMN public.produtos.peso_frete_tipo IS 'Tipo de cálculo do peso para frete: fixo (usa embalagem_peso) ou calculado (peso_unitario * quantidade)';