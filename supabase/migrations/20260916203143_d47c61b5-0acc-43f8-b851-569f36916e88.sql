
CREATE OR REPLACE FUNCTION public.auth_usuario_tem_papel(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    JOIN public.usuarios u ON u.id = r.user_id
    WHERE u.auth_user_id = auth.uid()
      AND r.role = _role
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_usuario_tem_papel(app_role) TO authenticated;

DROP POLICY IF EXISTS "Users can view their establishment UCM config" ON public.ucm_config;
DROP POLICY IF EXISTS "Manage UCM config admin/gestor insert" ON public.ucm_config;
DROP POLICY IF EXISTS "Manage UCM config admin/gestor update" ON public.ucm_config;
DROP POLICY IF EXISTS "Manage UCM config admin/gestor delete" ON public.ucm_config;

CREATE POLICY "ucm_config_select" ON public.ucm_config
FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

CREATE POLICY "ucm_config_insert" ON public.ucm_config
FOR INSERT TO authenticated
WITH CHECK (
  (estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.auth_usuario_tem_papel('admin') OR public.auth_usuario_tem_papel('gestor')))
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

CREATE POLICY "ucm_config_update" ON public.ucm_config
FOR UPDATE TO authenticated
USING (
  (estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.auth_usuario_tem_papel('admin') OR public.auth_usuario_tem_papel('gestor')))
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
)
WITH CHECK (
  (estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.auth_usuario_tem_papel('admin') OR public.auth_usuario_tem_papel('gestor')))
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

CREATE POLICY "ucm_config_delete" ON public.ucm_config
FOR DELETE TO authenticated
USING (
  (estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND (public.auth_usuario_tem_papel('admin') OR public.auth_usuario_tem_papel('gestor')))
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ucm_config TO authenticated;
GRANT ALL ON public.ucm_config TO service_role;
