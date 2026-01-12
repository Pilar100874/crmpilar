-- Adicionar colunas de latitude e longitude na tabela unidades
ALTER TABLE public.unidades 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;