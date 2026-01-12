-- Adicionar colunas de coordenadas e região à tabela municipios_renda
ALTER TABLE public.municipios_renda 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS regiao TEXT,
ADD COLUMN IF NOT EXISTS mesorregiao TEXT,
ADD COLUMN IF NOT EXISTS microrregiao TEXT;

-- Índice para busca geográfica
CREATE INDEX IF NOT EXISTS idx_municipios_renda_coords 
ON public.municipios_renda(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Índice para busca por UF
CREATE INDEX IF NOT EXISTS idx_municipios_renda_uf 
ON public.municipios_renda(uf);

-- Índice para busca por código IBGE
CREATE INDEX IF NOT EXISTS idx_municipios_renda_codigo_ibge 
ON public.municipios_renda(codigo_ibge);