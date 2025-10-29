-- Rename razao_social column to nome in empresas table
ALTER TABLE public.empresas 
RENAME COLUMN razao_social TO nome;