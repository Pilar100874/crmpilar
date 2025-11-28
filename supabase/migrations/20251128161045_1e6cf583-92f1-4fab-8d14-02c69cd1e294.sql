-- Adicionar campo para armazenar a fórmula de frete selecionada
ALTER TABLE public.veiculos_custos 
ADD COLUMN IF NOT EXISTS formula_frete JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.veiculos_custos.formula_frete IS 'Fórmula de cálculo de frete personalizada para este veículo';