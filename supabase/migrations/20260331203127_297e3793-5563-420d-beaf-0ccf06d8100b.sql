-- Add catalog mode and price visibility toggles to ecommerce_config
ALTER TABLE public.ecommerce_config 
  ADD COLUMN IF NOT EXISTS modo_catalogo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mostrar_precos_visitante_b2c boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_precos_visitante_b2b boolean NOT NULL DEFAULT true;

-- Add origin column to orcamentos to track ecommerce quotes
ALTER TABLE public.orcamentos 
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'interno';
