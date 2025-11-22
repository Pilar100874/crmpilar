-- Ajustar função get_user_estabelecimento_id para usar auth_user_id
CREATE OR REPLACE FUNCTION public.get_user_estabelecimento_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT estabelecimento_id
  FROM public.usuarios
  WHERE auth_user_id = _user_id
  LIMIT 1;
$$;

-- Garantir que a policy de SELECT em estabelecimentos use essa função
DROP POLICY IF EXISTS "Usuarios veem seu estabelecimento" ON public.estabelecimentos;

CREATE POLICY "Usuarios veem seu estabelecimento"
ON public.estabelecimentos
FOR SELECT
TO authenticated
USING (
  id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM administradores WHERE id = auth.uid()
  )
);