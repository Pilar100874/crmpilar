
-- Corrigir implementação da função has_role sem mudar a assinatura
-- Mantém _user_id como parâmetro mas agora faz JOIN com usuarios
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- _user_id representa auth_user_id da tabela auth.users
  -- Fazemos JOIN com usuarios para mapear para o user_id da tabela user_roles
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.usuarios u ON ur.user_id = u.id
    WHERE u.auth_user_id = _user_id
      AND ur.role = _role
  )
$$;
