-- Add email configuration fields to usuarios table
ALTER TABLE public.usuarios
ADD COLUMN smtp text,
ADD COLUMN porta_smtp integer,
ADD COLUMN pop text,
ADD COLUMN porta_pop integer,
ADD COLUMN senha_email text,
ADD COLUMN usar_autenticacao boolean DEFAULT true;