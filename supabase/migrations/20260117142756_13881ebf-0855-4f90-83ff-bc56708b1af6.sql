-- Add google_places_api_key column to config table
ALTER TABLE prospects_b2b_config ADD COLUMN IF NOT EXISTS google_places_api_key TEXT;

-- Add custo_por_requisicao as alias (keeping compatibility)
ALTER TABLE prospects_b2b_config ADD COLUMN IF NOT EXISTS custo_por_requisicao NUMERIC(10,4) DEFAULT 0.017;