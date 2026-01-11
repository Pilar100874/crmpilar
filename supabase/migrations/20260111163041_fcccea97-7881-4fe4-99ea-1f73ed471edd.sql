-- Adicionar colunas de latitude e longitude na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Criar índice para busca geográfica
CREATE INDEX IF NOT EXISTS idx_empresas_coordinates ON public.empresas(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;