
-- Rename columns from quantity-based to order-total-based
ALTER TABLE public.ecommerce_volume_pricing 
  RENAME COLUMN quantidade_minima TO valor_minimo;

ALTER TABLE public.ecommerce_volume_pricing 
  RENAME COLUMN quantidade_maxima TO valor_maximo;

-- Change type to numeric for currency values
ALTER TABLE public.ecommerce_volume_pricing 
  ALTER COLUMN valor_minimo TYPE numeric USING valor_minimo::numeric;

ALTER TABLE public.ecommerce_volume_pricing 
  ALTER COLUMN valor_maximo TYPE numeric USING valor_maximo::numeric;
