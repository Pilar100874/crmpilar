GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Admins and system admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and system admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and system admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles in their establishment"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuarios current_user_record
    JOIN public.user_roles current_user_role
      ON current_user_role.user_id = current_user_record.id
     AND current_user_role.role = 'admin'::public.app_role
    JOIN public.usuarios target_user
      ON target_user.id = user_roles.user_id
    WHERE current_user_record.auth_user_id = auth.uid()
      AND current_user_record.estabelecimento_id = target_user.estabelecimento_id
  )
);

CREATE POLICY "Admins can update roles in their establishment"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios current_user_record
    JOIN public.user_roles current_user_role
      ON current_user_role.user_id = current_user_record.id
     AND current_user_role.role = 'admin'::public.app_role
    JOIN public.usuarios target_user
      ON target_user.id = user_roles.user_id
    WHERE current_user_record.auth_user_id = auth.uid()
      AND current_user_record.estabelecimento_id = target_user.estabelecimento_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.usuarios current_user_record
    JOIN public.user_roles current_user_role
      ON current_user_role.user_id = current_user_record.id
     AND current_user_role.role = 'admin'::public.app_role
    JOIN public.usuarios target_user
      ON target_user.id = user_roles.user_id
    WHERE current_user_record.auth_user_id = auth.uid()
      AND current_user_record.estabelecimento_id = target_user.estabelecimento_id
  )
);

CREATE POLICY "Admins can delete roles in their establishment"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.usuarios current_user_record
    JOIN public.user_roles current_user_role
      ON current_user_role.user_id = current_user_record.id
     AND current_user_role.role = 'admin'::public.app_role
    JOIN public.usuarios target_user
      ON target_user.id = user_roles.user_id
    WHERE current_user_record.auth_user_id = auth.uid()
      AND current_user_record.estabelecimento_id = target_user.estabelecimento_id
  )
);