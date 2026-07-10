
-- ============================================================
-- 1) api_endpoints: scope by estabelecimento
-- ============================================================
DROP POLICY IF EXISTS api_endpoints_auth_all ON public.api_endpoints;
CREATE POLICY api_endpoints_tenant_scoped ON public.api_endpoints
  FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- ============================================================
-- 2) sms_config: scope by estabelecimento
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can manage sms_config" ON public.sms_config;
CREATE POLICY sms_config_tenant_scoped ON public.sms_config
  FOR ALL TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- ============================================================
-- 3) Remove bootstrap "NOT roles_present()" bypass from credential tables
-- ============================================================
-- whatsapp_config
DROP POLICY IF EXISTS "Admins and gestores can manage whatsapp config" ON public.whatsapp_config;
CREATE POLICY "Admins and gestores can manage whatsapp config" ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view whatsapp config from same estabelecimento" ON public.whatsapp_config;
CREATE POLICY "Users can view whatsapp config from same estabelecimento" ON public.whatsapp_config
  FOR SELECT TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- resend_config
DROP POLICY IF EXISTS "Admins and gestores can delete resend config" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can insert resend config" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can update resend config" ON public.resend_config;
DROP POLICY IF EXISTS "All users can view resend config from same estabelecimento" ON public.resend_config;

CREATE POLICY "View resend config same estab" ON public.resend_config
  FOR SELECT TO authenticated
  USING (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Manage resend config admin/gestor" ON public.resend_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Update resend config admin/gestor" ON public.resend_config
  FOR UPDATE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Delete resend config admin/gestor" ON public.resend_config
  FOR DELETE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- ucm_config
DROP POLICY IF EXISTS "Admins and gestores can delete UCM config" ON public.ucm_config;
DROP POLICY IF EXISTS "Admins and gestores can insert UCM config" ON public.ucm_config;
DROP POLICY IF EXISTS "Admins and gestores can update UCM config" ON public.ucm_config;

CREATE POLICY "Manage UCM config admin/gestor insert" ON public.ucm_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Manage UCM config admin/gestor update" ON public.ucm_config
  FOR UPDATE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Manage UCM config admin/gestor delete" ON public.ucm_config
  FOR DELETE TO authenticated
  USING (
    (estabelecimento_id = public.get_auth_user_estabelecimento_id()
     AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- ============================================================
-- 4) CV tables that already have estabelecimento_id: scope
-- ============================================================
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['cv_vehicles','cv_drivers','cv_helpers','cv_vehicle_movements','cv_defect_reports','cv_defect_types'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_all_authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_authenticated_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated manage helpers', t);
  END LOOP;
END $$;

CREATE POLICY cv_vehicles_tenant ON public.cv_vehicles FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY cv_drivers_tenant ON public.cv_drivers FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY cv_helpers_tenant ON public.cv_helpers FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY cv_movements_tenant ON public.cv_vehicle_movements FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY cv_defect_reports_tenant ON public.cv_defect_reports FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY cv_defect_types_tenant ON public.cv_defect_types FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

-- ============================================================
-- 5) CV tables missing estabelecimento_id: add + backfill to Zioni
-- ============================================================
ALTER TABLE public.cv_cameras ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.cv_coletor_config ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.cv_inspection_config ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

UPDATE public.cv_cameras SET estabelecimento_id = 'd579d299-e5c1-4b03-b74d-94b4af13e871' WHERE estabelecimento_id IS NULL;
UPDATE public.cv_coletor_config SET estabelecimento_id = 'd579d299-e5c1-4b03-b74d-94b4af13e871' WHERE estabelecimento_id IS NULL;
UPDATE public.cv_inspection_config SET estabelecimento_id = 'd579d299-e5c1-4b03-b74d-94b4af13e871' WHERE estabelecimento_id IS NULL;

DROP POLICY IF EXISTS cv_cameras_authenticated_all ON public.cv_cameras;
CREATE POLICY cv_cameras_tenant ON public.cv_cameras FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

DROP POLICY IF EXISTS cv_coletor_config_auth_all ON public.cv_coletor_config;
CREATE POLICY cv_coletor_config_tenant ON public.cv_coletor_config FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

DROP POLICY IF EXISTS cv_inspection_config_all_auth ON public.cv_inspection_config;
CREATE POLICY cv_inspection_config_tenant ON public.cv_inspection_config FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

-- cv_movement_photos: scope via join to cv_vehicle_movements
DROP POLICY IF EXISTS cv_movement_photos_all_auth ON public.cv_movement_photos;
CREATE POLICY cv_movement_photos_tenant ON public.cv_movement_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cv_vehicle_movements m
      WHERE m.id = cv_movement_photos.movement_id
        AND (m.estabelecimento_id = public.get_auth_user_estabelecimento_id()
             OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cv_vehicle_movements m
      WHERE m.id = cv_movement_photos.movement_id
        AND (m.estabelecimento_id = public.get_auth_user_estabelecimento_id()
             OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

-- ============================================================
-- 6) vis_* tables: add estabelecimento_id + scope
-- ============================================================
ALTER TABLE public.vis_visitors ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.vis_access_records ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.vis_contact_persons ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.vis_pending_visitors ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);

DO $$ DECLARE t text; r record; BEGIN
  FOREACH t IN ARRAY ARRAY['vis_visitors','vis_access_records','vis_contact_persons','vis_pending_visitors'] LOOP
    FOR r IN EXECUTE format('SELECT policyname FROM pg_policies WHERE tablename=%L AND schemaname=''public''', t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY vis_visitors_tenant ON public.vis_visitors FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY vis_access_records_tenant ON public.vis_access_records FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY vis_contact_persons_tenant ON public.vis_contact_persons FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

CREATE POLICY vis_pending_visitors_tenant ON public.vis_pending_visitors FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR estabelecimento_id IS NULL OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()));

-- ============================================================
-- 7) empresas_cnae_municipios: writes restricted to admin/gestor
-- ============================================================
DROP POLICY IF EXISTS "Delete empresas_cnae_municipios autenticado" ON public.empresas_cnae_municipios;
DROP POLICY IF EXISTS "Insert empresas_cnae_municipios autenticado" ON public.empresas_cnae_municipios;
DROP POLICY IF EXISTS "Update empresas_cnae_municipios autenticado" ON public.empresas_cnae_municipios;

CREATE POLICY "Insert empresas_cnae_municipios admin/gestor" ON public.empresas_cnae_municipios
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Update empresas_cnae_municipios admin/gestor" ON public.empresas_cnae_municipios
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Delete empresas_cnae_municipios admin/gestor" ON public.empresas_cnae_municipios
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
