-- Corrigir a função is_system_admin() para reconhecer o padrão de email correto
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM administradores a 
    WHERE 'admin_' || a.cpf || '@sistema.local' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$;