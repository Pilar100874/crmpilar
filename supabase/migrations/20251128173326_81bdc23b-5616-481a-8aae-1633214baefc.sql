-- Add EAN and packaging image columns to produtos table
ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS ean_13 VARCHAR(13),
ADD COLUMN IF NOT EXISTS ean_14_1 VARCHAR(14),
ADD COLUMN IF NOT EXISTS ean_14_2 VARCHAR(14),
ADD COLUMN IF NOT EXISTS embalagem_img_ean13 TEXT,
ADD COLUMN IF NOT EXISTS embalagem_img_ean14_1 TEXT,
ADD COLUMN IF NOT EXISTS embalagem_img_ean14_2 TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.produtos.ean_13 IS 'Código de barras EAN-13 do produto';
COMMENT ON COLUMN public.produtos.ean_14_1 IS 'Código de barras EAN-14 para 1ª embalagem master (calculado)';
COMMENT ON COLUMN public.produtos.ean_14_2 IS 'Código de barras EAN-14 para 2ª embalagem master (calculado)';
COMMENT ON COLUMN public.produtos.embalagem_img_ean13 IS 'URL da imagem modelo da embalagem EAN-13';
COMMENT ON COLUMN public.produtos.embalagem_img_ean14_1 IS 'URL da imagem modelo da embalagem EAN-14(1)';
COMMENT ON COLUMN public.produtos.embalagem_img_ean14_2 IS 'URL da imagem modelo da embalagem EAN-14(2)';