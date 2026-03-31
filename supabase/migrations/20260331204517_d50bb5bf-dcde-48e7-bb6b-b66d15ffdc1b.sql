ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS modo_catalogo_b2c boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_catalogo_b2b boolean DEFAULT false;

-- Migrate existing data: if modo_catalogo was true, enable both
UPDATE public.ecommerce_config
SET modo_catalogo_b2c = modo_catalogo,
    modo_catalogo_b2b = modo_catalogo
WHERE modo_catalogo IS NOT NULL;