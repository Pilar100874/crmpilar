-- Add WAHA configuration fields to whatsapp_sessions table
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS waha_url text,
ADD COLUMN IF NOT EXISTS waha_api_key text;