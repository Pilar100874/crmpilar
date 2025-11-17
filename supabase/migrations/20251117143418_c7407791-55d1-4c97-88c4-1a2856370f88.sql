-- Adicionar campo de senha do ramal na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS ramal_senha text;

COMMENT ON COLUMN public.usuarios.ramal_senha IS 'Senha do ramal SIP para autenticação WebRTC';
