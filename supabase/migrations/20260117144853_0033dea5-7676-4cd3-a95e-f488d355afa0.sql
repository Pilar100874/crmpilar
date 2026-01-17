-- Adicionar coluna para configurar quais campos do Place Details capturar
ALTER TABLE public.prospects_b2b_config 
ADD COLUMN IF NOT EXISTS campos_place_details jsonb DEFAULT '{"contact": false, "atmosphere": false}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.prospects_b2b_config.campos_place_details IS 'Configuração de campos do Place Details: contact (telefone, website) e atmosphere (reviews, fotos)';