-- Adicionar colunas faltantes à tabela produtos_importados
ALTER TABLE produtos_importados
ADD COLUMN IF NOT EXISTS embalagem TEXT,
ADD COLUMN IF NOT EXISTS numero_folhas NUMERIC,
ADD COLUMN IF NOT EXISTS diametro TEXT;