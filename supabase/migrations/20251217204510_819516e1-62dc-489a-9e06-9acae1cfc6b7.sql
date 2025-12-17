-- Add tel column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tel text;

-- Add comment describing the field
COMMENT ON COLUMN public.customers.tel IS 'Telefone fixo do cliente (separado do WhatsApp)';