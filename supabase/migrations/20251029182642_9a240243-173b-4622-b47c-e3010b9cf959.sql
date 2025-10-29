-- Adicionar coluna bairro à tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN bairro text;