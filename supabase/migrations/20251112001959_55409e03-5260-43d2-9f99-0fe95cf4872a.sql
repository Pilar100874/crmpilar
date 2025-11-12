-- Add conversation_id to webhook_chat_sessions
ALTER TABLE webhook_chat_sessions 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;