-- Função para validar apenas um admin por estabelecimento
CREATE OR REPLACE FUNCTION public.validate_single_admin_per_estabelecimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas valida se a role é 'admin'
  IF NEW.role = 'admin' THEN
    -- Verifica se já existe outro usuário admin no mesmo estabelecimento
    IF EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN usuarios u ON ur.user_id = u.auth_user_id
      JOIN usuarios new_user ON NEW.user_id = new_user.auth_user_id
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

-- Criar trigger para validar antes de inserir ou atualizar
DROP TRIGGER IF EXISTS trigger_validate_single_admin ON public.user_roles;
CREATE TRIGGER trigger_validate_single_admin
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_single_admin_per_estabelecimento();