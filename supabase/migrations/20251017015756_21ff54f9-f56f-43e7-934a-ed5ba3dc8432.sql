-- Add unique constraints to prevent duplicate names
ALTER TABLE public.unidades ADD CONSTRAINT unidades_nome_unique UNIQUE (nome);
ALTER TABLE public.segmentos ADD CONSTRAINT segmentos_nome_unique UNIQUE (nome);
ALTER TABLE public.grupos_acesso ADD CONSTRAINT grupos_acesso_nome_unique UNIQUE (nome);

-- Add tipo_operador field to customers table
ALTER TABLE public.customers ADD COLUMN tipo_operador boolean DEFAULT false;