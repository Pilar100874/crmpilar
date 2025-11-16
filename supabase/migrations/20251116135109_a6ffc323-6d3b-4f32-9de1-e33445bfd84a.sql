-- Adicionar campo para controlar onde a API pode ser exibida
ALTER TABLE api_endpoints 
ADD COLUMN IF NOT EXISTS locais_permitidos TEXT[] DEFAULT ARRAY['relatorio', 'importar_empresa', 'criacao_bot']::TEXT[];