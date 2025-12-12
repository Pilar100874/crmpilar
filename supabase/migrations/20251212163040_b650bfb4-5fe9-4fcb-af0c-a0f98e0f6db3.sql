-- Adicionar colunas de array para múltiplos emails e WhatsApp nas empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS emails_vinculados text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS whatsapps_vinculados text[] DEFAULT '{}';