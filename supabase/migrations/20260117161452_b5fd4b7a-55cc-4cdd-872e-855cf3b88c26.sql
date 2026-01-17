-- Add fonte_dados column to prospects_b2b_config
ALTER TABLE public.prospects_b2b_config
ADD COLUMN IF NOT EXISTS fonte_dados text DEFAULT 'google_places';

-- Add comment
COMMENT ON COLUMN public.prospects_b2b_config.fonte_dados IS 'Fonte de dados: google_places (pago), dados_abertos (grátis), web_scraping (grátis)';