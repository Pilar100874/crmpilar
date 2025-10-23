-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view usuarios from same estabelecimento" ON public.usuarios;

-- Recreate the policy using the security definer function to avoid recursion
CREATE POLICY "Users can view usuarios from same estabelecimento"
ON public.usuarios
FOR SELECT
USING (
  (EXISTS (
    SELECT 1
    FROM administradores
    WHERE administradores.id = auth.uid()
  ))
  OR
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
);