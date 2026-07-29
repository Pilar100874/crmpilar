CREATE POLICY "Admins can manage usuarios"
ON public.usuarios
FOR ALL
TO authenticated
USING (
  public.is_system_admin()
  OR (public.has_role(auth.uid(), 'admin'::app_role)
      AND (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
           OR public.get_user_estabelecimento_id(auth.uid()) IS NULL))
)
WITH CHECK (
  public.is_system_admin()
  OR (public.has_role(auth.uid(), 'admin'::app_role)
      AND (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
           OR public.get_user_estabelecimento_id(auth.uid()) IS NULL))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;