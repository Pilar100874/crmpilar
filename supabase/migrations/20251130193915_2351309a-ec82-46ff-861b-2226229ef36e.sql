-- Adicionar campos extras para marketplaces
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS mpn VARCHAR(100),
ADD COLUMN IF NOT EXISTS gtin VARCHAR(14),
ADD COLUMN IF NOT EXISTS cor VARCHAR(100),
ADD COLUMN IF NOT EXISTS tamanho VARCHAR(50),
ADD COLUMN IF NOT EXISTS material VARCHAR(200),
ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
ADD COLUMN IF NOT EXISTS faixa_etaria VARCHAR(50),
ADD COLUMN IF NOT EXISTS categoria_google VARCHAR(500);

-- Adicionar comentários
COMMENT ON COLUMN public.produtos.mpn IS 'Manufacturer Part Number - código do fabricante';
COMMENT ON COLUMN public.produtos.gtin IS 'Global Trade Item Number (alternativo ao EAN)';
COMMENT ON COLUMN public.produtos.cor IS 'Cor principal do produto';
COMMENT ON COLUMN public.produtos.tamanho IS 'Tamanho do produto (ex: P, M, G, 42, etc)';
COMMENT ON COLUMN public.produtos.material IS 'Material principal do produto';
COMMENT ON COLUMN public.produtos.genero IS 'Gênero alvo (masculino, feminino, unissex)';
COMMENT ON COLUMN public.produtos.faixa_etaria IS 'Faixa etária alvo (adulto, infantil, bebê, etc)';
COMMENT ON COLUMN public.produtos.categoria_google IS 'ID da categoria do Google Shopping';