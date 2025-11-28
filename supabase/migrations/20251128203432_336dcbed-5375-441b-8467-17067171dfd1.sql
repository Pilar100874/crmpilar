-- Add column for range search on custom fields
ALTER TABLE public.produto_campos_customizados
ADD COLUMN IF NOT EXISTS pesquisa_faixa BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.produto_campos_customizados.pesquisa_faixa IS 'Permite pesquisar por faixa de valores (de X até Y) - apenas para campos numéricos';