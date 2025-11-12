-- Permitir múltiplos vínculos por empresa
-- Remover constraint única se existir e adicionar nova estrutura

-- Para empresa_vinculos: permitir múltiplos registros por empresa
-- Cada registro representa um vínculo específico (empresa + usuário + segmento)
-- Adicionar constraint para evitar duplicatas exatas
ALTER TABLE empresa_vinculos 
DROP CONSTRAINT IF EXISTS empresa_vinculos_empresa_id_key;

ALTER TABLE empresa_vinculos 
ADD CONSTRAINT empresa_vinculos_unique 
UNIQUE (empresa_id, usuario_id, segmento_id);

-- Para customer_vinculos: permitir múltiplos registros por contato
-- Cada registro representa um vínculo específico (contato + usuário + segmento)
ALTER TABLE customer_vinculos 
DROP CONSTRAINT IF EXISTS customer_vinculos_customer_id_key;

ALTER TABLE customer_vinculos 
ADD CONSTRAINT customer_vinculos_unique 
UNIQUE (customer_id, usuario_id, segmento_id);

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_empresa_id ON empresa_vinculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_usuario_id ON empresa_vinculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_segmento_id ON empresa_vinculos(segmento_id);

CREATE INDEX IF NOT EXISTS idx_customer_vinculos_customer_id ON customer_vinculos(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vinculos_usuario_id ON customer_vinculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_customer_vinculos_segmento_id ON customer_vinculos(segmento_id);