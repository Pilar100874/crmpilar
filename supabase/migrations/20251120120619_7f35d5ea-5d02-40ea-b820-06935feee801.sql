-- Adicionar coluna para vincular produtos à importação específica
ALTER TABLE produtos_importados 
ADD COLUMN relatorio_importacao_id uuid REFERENCES relatorios_importacao(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX idx_produtos_importados_relatorio ON produtos_importados(relatorio_importacao_id);