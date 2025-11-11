-- Add session_name column to whatsapp_config table
ALTER TABLE whatsapp_config 
ADD COLUMN IF NOT EXISTS session_name TEXT DEFAULT 'default';

-- Update existing record with the correct session name
UPDATE whatsapp_config 
SET session_name = 'pilar2' 
WHERE waha_url = 'https://waha.pilar.com.br';

-- Add comment
COMMENT ON COLUMN whatsapp_config.session_name IS 'Nome da sessão WAHA configurada no servidor';