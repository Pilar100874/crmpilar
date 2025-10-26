-- Adicionar coluna de descrição na tabela bot_flows
ALTER TABLE bot_flows ADD COLUMN IF NOT EXISTS description TEXT;