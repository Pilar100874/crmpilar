-- Adjust SELECT policies for public.grupos_acesso to allow initial setup visibility
-- Remove existing SELECT policies
DROP POLICY IF EXISTS "Users can view grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can view grupos_acesso from same estabelecimento" ON public.grupos_acesso;

-- Create a single SELECT policy that also allows reads when no roles exist (initial setup)
CREATE POLICY "View grupos_acesso (init or permitted)"
ON public.grupos_acesso
FOR SELECT
USING (
  -- Allow viewing during initial setup when no roles have been defined yet
  (NOT public.roles_present())
  OR 
  -- Administrators can view all
  (EXISTS (
    SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()
  ))
  OR 
  -- Users can view groups from their own estabelecimento
  (estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.id = auth.uid()
  ))
);
