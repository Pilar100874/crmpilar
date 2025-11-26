
-- Corrigir função validate_single_admin_per_estabelecimento
-- O JOIN estava errado: user_roles.user_id referencia usuarios.id, não auth_user_id
CREATE OR REPLACE FUNCTION public.validate_single_admin_per_estabelecimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apenas valida se a role é 'admin'
  IF NEW.role = 'admin' THEN
    -- Verifica se já existe outro usuário admin no mesmo estabelecimento
    IF EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN usuarios u ON ur.user_id = u.id  -- CORRIGIDO: era auth_user_id, agora é id
      JOIN usuarios new_user ON NEW.user_id = new_user.id  -- CORRIGIDO: era auth_user_id
      WHERE ur.role = 'admin'
        AND u.estabelecimento_id = new_user.estabelecimento_id
        AND ur.user_id != NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Já existe um usuário com role admin neste estabelecimento';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
