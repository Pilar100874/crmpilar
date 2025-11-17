-- Habilitar RLS na tabela ucm_config (se ainda não estiver habilitado)
ALTER TABLE ucm_config ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "ucm_config_auth_all" ON ucm_config;

-- Criar política simples para permitir todos os usuários autenticados gerenciarem UCM config
CREATE POLICY "ucm_config_auth_all" ON ucm_config
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);