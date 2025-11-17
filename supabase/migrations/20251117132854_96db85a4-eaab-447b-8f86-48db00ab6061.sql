-- Adicionar campo para indicar se UCM é local ou web
ALTER TABLE ucm_config ADD COLUMN IF NOT EXISTS is_local BOOLEAN DEFAULT true;

-- Adicionar comentário explicativo
COMMENT ON COLUMN ucm_config.is_local IS 'Indica se o UCM está na rede local (true) ou acessível via internet (false)';