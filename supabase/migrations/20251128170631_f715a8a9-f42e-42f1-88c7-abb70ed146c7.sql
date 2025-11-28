-- Adicionar campos para cálculo de frete com terceiros na tabela produtos
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS altura numeric,
ADD COLUMN IF NOT EXISTS embalagem_largura numeric,
ADD COLUMN IF NOT EXISTS embalagem_altura numeric,
ADD COLUMN IF NOT EXISTS embalagem_comprimento numeric,
ADD COLUMN IF NOT EXISTS embalagem_peso numeric,
ADD COLUMN IF NOT EXISTS ncm text,
ADD COLUMN IF NOT EXISTS cubagem numeric,
ADD COLUMN IF NOT EXISTS fragil boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS empilhamento_maximo integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS valor_seguro numeric,
ADD COLUMN IF NOT EXISTS observacoes_frete text;

-- Comentários para documentação
COMMENT ON COLUMN public.produtos.altura IS 'Altura do produto em cm';
COMMENT ON COLUMN public.produtos.embalagem_largura IS 'Largura da embalagem em cm';
COMMENT ON COLUMN public.produtos.embalagem_altura IS 'Altura da embalagem em cm';
COMMENT ON COLUMN public.produtos.embalagem_comprimento IS 'Comprimento da embalagem em cm';
COMMENT ON COLUMN public.produtos.embalagem_peso IS 'Peso total com embalagem em kg';
COMMENT ON COLUMN public.produtos.ncm IS 'Código NCM para classificação fiscal';
COMMENT ON COLUMN public.produtos.cubagem IS 'Cubagem calculada em m³';
COMMENT ON COLUMN public.produtos.fragil IS 'Indica se o produto é frágil';
COMMENT ON COLUMN public.produtos.empilhamento_maximo IS 'Número máximo de empilhamento permitido';
COMMENT ON COLUMN public.produtos.valor_seguro IS 'Valor para cálculo de seguro do frete';
COMMENT ON COLUMN public.produtos.observacoes_frete IS 'Observações especiais para transporte';