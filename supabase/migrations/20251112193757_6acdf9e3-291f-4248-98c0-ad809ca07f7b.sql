-- Adiciona campo whatsapp_type na tabela bot_flows
ALTER TABLE bot_flows 
ADD COLUMN IF NOT EXISTS whatsapp_type TEXT DEFAULT 'waha' CHECK (whatsapp_type IN ('waha', 'business'));

-- Atualiza todos os bots WhatsApp existentes para serem do tipo 'waha'
UPDATE bot_flows 
SET whatsapp_type = 'waha'
WHERE 'whatsapp' = ANY(canais);