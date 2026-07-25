
-- 1) Harden roles_present() so anonymous callers (auth.uid() IS NULL) return TRUE.
-- This makes `NOT roles_present()` evaluate to FALSE for anonymous requests,
-- preventing the fallback branch in many RLS policies from granting access to anon.
CREATE OR REPLACE FUNCTION public.roles_present()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.usuarios u ON u.id = ur.user_id
      WHERE u.estabelecimento_id = public.get_auth_user_estabelecimento_id()
    )
  END
$function$;

-- 2) Restrict avisos_sistema SELECT policy to authenticated users only.
DROP POLICY IF EXISTS "Usuários veem avisos de seu estabelecimento" ON public.avisos_sistema;
CREATE POLICY "Usuários veem avisos de seu estabelecimento"
ON public.avisos_sistema
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    estabelecimento_id IS NULL
    OR estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id FROM public.usuarios
      WHERE usuarios.auth_user_id = auth.uid()
    )
  )
);
