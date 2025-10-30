-- Adicionar coluna empresa_id na tabela orcamentos
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id);

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa_id ON orcamentos(empresa_id);