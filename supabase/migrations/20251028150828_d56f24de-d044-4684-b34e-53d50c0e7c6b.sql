-- Drop existing policies on unidades
DROP POLICY IF EXISTS "Manage unidades (admin/gestor or admin)" ON public.unidades;
DROP POLICY IF EXISTS "View unidades (same estab or admin)" ON public.unidades;

-- Create more permissive policies for unidades
-- Allow viewing for users in the same establishment or admins
CREATE POLICY "View unidades (same estab or admin)"
ON public.unidades
FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- Allow all operations for users in the same establishment (if they're admin/gestor) or admins
CREATE POLICY "Manage unidades (same estab admin/gestor or admin)"
ON public.unidades
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);