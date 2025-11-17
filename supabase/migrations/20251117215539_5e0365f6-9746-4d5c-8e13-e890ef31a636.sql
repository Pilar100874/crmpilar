-- Adicionar coluna para endereço remoto do UCM
ALTER TABLE public.ucm_config 
ADD COLUMN IF NOT EXISTS remote_ip VARCHAR(255);

COMMENT ON COLUMN public.ucm_config.remote_ip IS 'Endereço IP/URL remoto do UCM para acesso externo';
