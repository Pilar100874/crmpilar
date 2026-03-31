-- Add tipo_cliente to empresas
ALTER TABLE public.empresas 
ADD COLUMN tipo_cliente text NOT NULL DEFAULT 'B2B';

-- Add comment for clarity
COMMENT ON COLUMN public.empresas.tipo_cliente IS 'Tipo de cliente: B2B, B2C, B2G';