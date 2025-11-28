-- Adicionar colunas faltantes na tabela veiculos_custos para cálculo de frete
ALTER TABLE public.veiculos_custos 
ADD COLUMN IF NOT EXISTS pernoite numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS adic_hora_extra_perc numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS jornada_base_dia numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS horas_mensais numeric DEFAULT 220;

-- Comentários para documentar os campos
COMMENT ON COLUMN public.veiculos_custos.pernoite IS 'Valor da pernoite por pessoa (R$)';
COMMENT ON COLUMN public.veiculos_custos.adic_hora_extra_perc IS 'Percentual adicional de hora extra (ex: 50 = 50%)';
COMMENT ON COLUMN public.veiculos_custos.jornada_base_dia IS 'Jornada normal antes de hora extra (horas)';
COMMENT ON COLUMN public.veiculos_custos.horas_mensais IS 'Quantidade de horas mensais de trabalho (padrão 220h)';