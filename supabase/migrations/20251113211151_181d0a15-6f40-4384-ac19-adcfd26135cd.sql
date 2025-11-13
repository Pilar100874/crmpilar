-- Adicionar coluna auth_user_id na tabela usuarios para vincular com auth.users
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON usuarios(auth_user_id);

-- Atualizar registros existentes: mapear email do auth.users para usuarios
UPDATE usuarios u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email
AND u.auth_user_id IS NULL;