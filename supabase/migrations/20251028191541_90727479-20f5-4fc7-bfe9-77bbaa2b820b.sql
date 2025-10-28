-- Adjust RLS policies on orcamentos to allow admins to bypass role requirement
-- and keep establishment-bound access for other users

-- Ensure table has RLS enabled (no-op if already enabled)
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Drop existing generic manage policy if it exists
DROP POLICY IF EXISTS "Manage orcamentos (same estab or admin)" ON public.orcamentos;

-- Policy 1: Admins can manage all orcamentos without additional role checks
CREATE POLICY "Admins manage orcamentos"
ON public.orcamentos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.administradores a
    WHERE a.id = auth.uid()
  )
);

-- Policy 2: Non-admin users can manage orcamentos for their establishment
CREATE POLICY "Users manage own establishment orcamentos"
ON public.orcamentos
FOR ALL
USING (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR (NOT roles_present()))
)
WITH CHECK (
  (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR (NOT roles_present()))
);
