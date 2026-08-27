DROP POLICY IF EXISTS "Admins can insert roles in their establishment" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in their establishment" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in their establishment" ON public.user_roles;

CREATE POLICY "Admins can insert roles in their establishment"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.usuarios target_user
    WHERE target_user.id = user_roles.user_id
      AND target_user.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
);

CREATE POLICY "Admins can update roles in their establishment"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.usuarios target_user
    WHERE target_user.id = user_roles.user_id
      AND target_user.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.usuarios target_user
    WHERE target_user.id = user_roles.user_id
      AND target_user.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
);

CREATE POLICY "Admins can delete roles in their establishment"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.usuarios target_user
    WHERE target_user.id = user_roles.user_id
      AND target_user.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
);