-- Add telephony fields to usuarios table
ALTER TABLE public.usuarios
ADD COLUMN ramal TEXT,
ADD COLUMN senha_sip TEXT,
ADD COLUMN usuario_sip TEXT;