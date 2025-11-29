-- Drop conflicting SELECT policies on estabelecimentos
DROP POLICY IF EXISTS "Usuarios veem seu estabelecimento" ON public.estabelecimentos;
DROP POLICY IF EXISTS "View estabelecimentos (same estab or admin)" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Apenas administradores criam estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Admins modificam estabelecimentos" ON public.estabelecimentos;
DROP POLICY IF EXISTS "Apenas administradores excluem estabelecimentos" ON public.estabelecimentos;

-- Create a helper function to check if current user is a system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM administradores a 
    WHERE a.cpf || '@sistema.local' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$;

-- Create unified SELECT policy that properly identifies system admins
CREATE POLICY "estabelecimentos_select_policy"
ON public.estabelecimentos FOR SELECT
USING (
  -- System admins (from administradores table) can see all
  is_system_admin()
  -- Or establishment admins can see their establishment
  OR (has_role(auth.uid(), 'admin'::app_role) AND id = get_user_estabelecimento_id(auth.uid()))
  -- Or regular users can see their establishment
  OR id = get_user_estabelecimento_id(auth.uid())
);

-- CREATE policy - only system admins
CREATE POLICY "estabelecimentos_insert_policy"
ON public.estabelecimentos FOR INSERT
WITH CHECK (is_system_admin());

-- UPDATE policy - system admins or establishment admins for their own
CREATE POLICY "estabelecimentos_update_policy"
ON public.estabelecimentos FOR UPDATE
USING (
  is_system_admin()
  OR (has_role(auth.uid(), 'admin'::app_role) AND id = get_user_estabelecimento_id(auth.uid()))
);

-- DELETE policy - only system admins
CREATE POLICY "estabelecimentos_delete_policy"
ON public.estabelecimentos FOR DELETE
USING (is_system_admin());