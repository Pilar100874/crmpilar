-- Adicionar campos necessários para marketplaces na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS marca TEXT,
ADD COLUMN IF NOT EXISTS estoque INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS garantia TEXT,
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'nacional',
ADD COLUMN IF NOT EXISTS condicao TEXT DEFAULT 'novo';

-- Adicionar índices para campos de busca
CREATE INDEX IF NOT EXISTS idx_produtos_marca ON public.produtos(marca);
CREATE INDEX IF NOT EXISTS idx_produtos_condicao ON public.produtos(condicao);

COMMENT ON COLUMN public.produtos.descricao IS 'Descrição detalhada do produto para marketplaces';
COMMENT ON COLUMN public.produtos.marca IS 'Marca do produto';
COMMENT ON COLUMN public.produtos.estoque IS 'Quantidade em estoque';
COMMENT ON COLUMN public.produtos.garantia IS 'Informações de garantia';
COMMENT ON COLUMN public.produtos.origem IS 'Origem do produto: nacional ou importado';
COMMENT ON COLUMN public.produtos.condicao IS 'Condição: novo, usado, recondicionado';