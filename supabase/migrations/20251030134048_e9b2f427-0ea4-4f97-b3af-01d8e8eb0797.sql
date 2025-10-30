-- Tornar o campo nome_fantasia opcional na tabela empresas
ALTER TABLE public.empresas 
ALTER COLUMN nome_fantasia DROP NOT NULL;