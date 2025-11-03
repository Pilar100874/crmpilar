-- Add webhook_url to whatsapp_config table instead of whatsapp_sessions
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS webhook_url text;

-- Remove webhook_url from whatsapp_sessions if it exists
ALTER TABLE whatsapp_sessions DROP COLUMN IF EXISTS webhook_url;

-- Remove waha_url and waha_api_key from whatsapp_sessions (they belong in whatsapp_config)
ALTER TABLE whatsapp_sessions DROP COLUMN IF EXISTS waha_url;
ALTER TABLE whatsapp_sessions DROP COLUMN IF EXISTS waha_api_key;