CREATE POLICY "ferr_roles_self_bootstrap"
ON public.ferr_user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (SELECT 1 FROM public.ferr_user_roles r WHERE r.user_id = auth.uid())
);