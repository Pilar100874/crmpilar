-- Adicionar campos de endereço completo na tabela unidades
ALTER TABLE public.unidades
ADD COLUMN cep TEXT,
ADD COLUMN logradouro TEXT,
ADD COLUMN numero TEXT,
ADD COLUMN complemento TEXT,
ADD COLUMN bairro TEXT,
ADD COLUMN cidade TEXT,
ADD COLUMN uf TEXT;

-- Criar índice para busca por CEP
CREATE INDEX IF NOT EXISTS idx_unidades_cep ON public.unidades(cep);

-- Adicionar comentários nas colunas
COMMENT ON COLUMN public.unidades.cep IS 'CEP da unidade para cálculo de distância';
COMMENT ON COLUMN public.unidades.logradouro IS 'Endereço completo da unidade';
COMMENT ON COLUMN public.unidades.numero IS 'Número do endereço';
COMMENT ON COLUMN public.unidades.complemento IS 'Complemento do endereço';
COMMENT ON COLUMN public.unidades.bairro IS 'Bairro da unidade';
COMMENT ON COLUMN public.unidades.cidade IS 'Cidade da unidade';
COMMENT ON COLUMN public.unidades.uf IS 'Estado (UF) da unidade';