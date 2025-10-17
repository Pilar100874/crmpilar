-- Add unique constraints to customers table
ALTER TABLE public.customers 
  ADD CONSTRAINT customers_nome_unique UNIQUE (nome);

ALTER TABLE public.customers 
  ADD CONSTRAINT customers_email_unique UNIQUE (email);

ALTER TABLE public.customers 
  ADD CONSTRAINT customers_telefone_unique UNIQUE (telefone);

-- Make fields not nullable
ALTER TABLE public.customers 
  ALTER COLUMN nome SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN telefone SET NOT NULL;