
-- tracker_device_models
DROP POLICY IF EXISTS "Users of establishment can read tracker models" ON public.tracker_device_models;
DROP POLICY IF EXISTS "Users can insert tracker models" ON public.tracker_device_models;
DROP POLICY IF EXISTS "Users can update tracker models" ON public.tracker_device_models;
DROP POLICY IF EXISTS "Users can delete tracker models" ON public.tracker_device_models;

CREATE POLICY "tracker_models_select_tenant" ON public.tracker_device_models
FOR SELECT TO authenticated
USING (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE POLICY "tracker_models_insert_tenant" ON public.tracker_device_models
FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE POLICY "tracker_models_update_tenant" ON public.tracker_device_models
FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE POLICY "tracker_models_delete_tenant" ON public.tracker_device_models
FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- chat_tags_aplicadas
DROP POLICY IF EXISTS "Atendentes podem aplicar tags" ON public.chat_tags_aplicadas;
DROP POLICY IF EXISTS "Autenticados veem tags aplicadas" ON public.chat_tags_aplicadas;

CREATE POLICY "chat_tags_aplicadas_select_tenant" ON public.chat_tags_aplicadas
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = chat_tags_aplicadas.chat_id
    AND (c.estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
));

CREATE POLICY "chat_tags_aplicadas_manage_tenant" ON public.chat_tags_aplicadas
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = chat_tags_aplicadas.chat_id
    AND (c.estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.conversations c
  WHERE c.id = chat_tags_aplicadas.chat_id
    AND (c.estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
));

-- cv bypass policies
DROP POLICY IF EXISTS "cv_defects_all_authenticated" ON public.cv_defect_reports;
DROP POLICY IF EXISTS "cv_movements_all_authenticated" ON public.cv_vehicle_movements;

-- isocronas
DROP POLICY IF EXISTS "Qualquer um pode ler isocronas" ON public.isocronas;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar isocronas" ON public.isocronas;

CREATE POLICY "isocronas_tenant" ON public.isocronas
FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id()::text OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id()::text OR public.is_system_admin());

-- dispositivos_rastreamento pendentes
DROP POLICY IF EXISTS "Usuarios autenticados podem ver dispositivos pendentes sem esta" ON public.dispositivos_rastreamento;
DROP POLICY IF EXISTS "Usuarios autenticados podem aprovar dispositivos pendentes" ON public.dispositivos_rastreamento;

CREATE POLICY "Admins veem dispositivos pendentes sem estabelecimento" ON public.dispositivos_rastreamento
FOR SELECT TO authenticated
USING (
  estabelecimento_id IS NULL AND status = 'pendente'
  AND (public.is_system_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins aprovam dispositivos pendentes" ON public.dispositivos_rastreamento
FOR UPDATE TO authenticated
USING (
  estabelecimento_id IS NULL AND status = 'pendente'
  AND (public.is_system_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND usuario_id = (SELECT u.id FROM public.usuarios u WHERE u.auth_user_id = auth.uid())
);

-- user_roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;

CREATE POLICY "Users view own roles or admins view establishment roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  public.is_system_admin()
  OR user_id = (SELECT u.id FROM public.usuarios u WHERE u.auth_user_id = auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = user_roles.user_id
        AND u.estabelecimento_id = public.get_auth_user_estabelecimento_id()
    )
  )
);
