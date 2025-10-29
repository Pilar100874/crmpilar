-- Adicionar constraint UNIQUE para CNPJ evitar duplicatas
-- Remover constraint antiga se existir
ALTER TABLE empresas DROP CONSTRAINT IF EXISTS empresas_cnpj_estabelecimento_key;

-- Criar nova constraint composta (cnpj + estabelecimento_id)
ALTER TABLE empresas 
ADD CONSTRAINT empresas_cnpj_estabelecimento_key 
UNIQUE (cnpj, estabelecimento_id);