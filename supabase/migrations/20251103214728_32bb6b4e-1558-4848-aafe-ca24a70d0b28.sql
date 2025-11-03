-- Add webhook_url field to whatsapp_sessions
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS webhook_url text;