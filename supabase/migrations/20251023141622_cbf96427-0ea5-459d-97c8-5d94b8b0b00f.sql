-- Create security definer function to get user's estabelecimento_id
CREATE OR REPLACE FUNCTION public.get_user_estabelecimento_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT estabelecimento_id
  FROM public.usuarios
  WHERE id = _user_id
  LIMIT 1;
$$;

-- Drop existing policies for usuarios
DROP POLICY IF EXISTS "Users can manage usuarios from same estabelecimento" ON usuarios;
DROP POLICY IF EXISTS "Users can view usuarios from same estabelecimento" ON usuarios;

-- Create new policies using the security definer function
CREATE POLICY "Users can manage usuarios from same estabelecimento"
ON usuarios
FOR ALL
TO authenticated
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
  OR 
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can view usuarios from same estabelecimento"
ON usuarios
FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR 
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);