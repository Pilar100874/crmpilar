-- Adicionar coluna de canais à tabela bot_flows
ALTER TABLE bot_flows 
ADD COLUMN IF NOT EXISTS canais text[] DEFAULT ARRAY['whatsapp']::text[];

COMMENT ON COLUMN bot_flows.canais IS 'Canais de atendimento suportados pelo bot: whatsapp, webchat, telegram, facebook, instagram';