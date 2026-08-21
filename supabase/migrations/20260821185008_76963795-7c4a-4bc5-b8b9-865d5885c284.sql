CREATE TABLE public.op_access_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  base_role op_app_role NOT NULL DEFAULT 'worker',
  allowed_menus TEXT[] NOT NULL DEFAULT '{}',
  establishment_id UUID REFERENCES public.op_establishments(id),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_profiles ADD COLUMN access_level_id UUID REFERENCES public.op_access_levels(id);
ALTER TABLE public.op_access_levels ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_access_levels TO authenticated;
GRANT ALL ON public.op_access_levels TO service_role;
CREATE POLICY "Admin/Manager can manage op_access_levels"
  ON public.op_access_levels FOR ALL
  USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "View op_access_levels in establishment"
  ON public.op_access_levels FOR SELECT
  USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE TRIGGER update_access_levels_updated_at
  BEFORE UPDATE ON public.op_access_levels
  FOR EACH ROW
  EXECUTE FUNCTION op_set_updated_at();
CREATE OR REPLACE FUNCTION public.op_sync_multi_person_task_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_required_workers integer;
  v_template_id uuid;
  v_scheduled_date date;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  v_template_id := NEW.task_template_id;
  v_scheduled_date := NEW.scheduled_date;
  SELECT required_workers INTO v_required_workers
  FROM op_task_templates
  WHERE id = v_template_id;
  IF v_required_workers IS NULL OR v_required_workers <= 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.status IN ('in_progress', 'completed', 'delayed', 'not_done') THEN
    UPDATE op_task_executions
    SET 
      status = NEW.status,
      started_at = CASE 
        WHEN NEW.status = 'in_progress' AND started_at IS NULL THEN NEW.started_at 
        ELSE started_at 
      END,
      actual_start_time = CASE 
        WHEN NEW.status = 'in_progress' AND actual_start_time IS NULL THEN NEW.actual_start_time 
        ELSE actual_start_time 
      END,
      completed_at = CASE 
        WHEN NEW.status IN ('completed', 'delayed', 'not_done') THEN NEW.completed_at 
        ELSE completed_at 
      END,
      updated_at = now()
    WHERE task_template_id = v_template_id
      AND scheduled_date = v_scheduled_date
      AND id != NEW.id
      AND status != NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trigger_sync_multi_person_status
  AFTER UPDATE OF status ON public.op_task_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.op_sync_multi_person_task_status();
CREATE OR REPLACE FUNCTION public.op_calculate_smart_priority(p_task_execution_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_priority integer := 50;
  v_template_priority integer;
  v_priority_order integer;
  v_sla_minutes integer;
  v_started_at timestamp with time zone;
  v_elapsed_minutes integer;
  v_status text;
  v_is_outdoor boolean;
  v_sector_id uuid;
  v_has_blocking_condition boolean := false;
  v_has_materials boolean := true;
BEGIN
  SELECT 
    te.status,
    te.started_at,
    tt.priority,
    tt.priority_order,
    tt.sla_minutes,
    tt.is_outdoor,
    tt.sector_id
  INTO v_status, v_started_at, v_template_priority, v_priority_order, v_sla_minutes, v_is_outdoor, v_sector_id
  FROM op_task_executions te
  JOIN op_task_templates tt ON te.task_template_id = tt.id
  WHERE te.id = p_task_execution_id;
  v_priority := COALESCE(v_template_priority, 5) * 10;
  IF v_priority_order IS NOT NULL THEN
    v_priority := v_priority + v_priority_order;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM op_operational_conditions oc
    WHERE oc.is_active = true
    AND oc.severity = 'critical'
    AND (
      (v_is_outdoor AND oc.affects_outdoor_tasks)
      OR (v_sector_id = ANY(oc.affected_sectors))
    )
  ) INTO v_has_blocking_condition;
  IF v_has_blocking_condition THEN
    v_priority := v_priority - 50;
  END IF;
  IF v_status = 'delayed' THEN
    v_priority := v_priority + 30;
  END IF;
  IF v_started_at IS NOT NULL AND v_sla_minutes IS NOT NULL THEN
    v_elapsed_minutes := EXTRACT(EPOCH FROM (now() - v_started_at)) / 60;
    IF v_elapsed_minutes > v_sla_minutes THEN
      v_priority := v_priority + 40;
    ELSIF v_elapsed_minutes > (v_sla_minutes * 0.75) THEN
      v_priority := v_priority + 20;
    END IF;
  END IF;
  SELECT NOT EXISTS (
    SELECT 1 FROM op_task_template_materials ttm
    JOIN op_materials m ON ttm.material_id = m.id
    WHERE ttm.task_template_id = (
      SELECT task_template_id FROM op_task_executions WHERE id = p_task_execution_id
    )
    AND m.current_stock < COALESCE(ttm.quantity_needed, 1)
  ) INTO v_has_materials;
  IF NOT v_has_materials THEN
    v_priority := v_priority - 30;
  END IF;
  RETURN GREATEST(LEAST(v_priority, 100), 0);
END;
$$;
ALTER TABLE public.op_task_executions ALTER COLUMN task_template_id DROP NOT NULL;
ALTER TABLE public.op_task_executions ADD COLUMN irregularity_id uuid REFERENCES public.op_irregularities(id) ON DELETE SET NULL;
ALTER TABLE public.op_irregularities ADD COLUMN dispatched_by uuid;
ALTER TABLE public.op_irregularities ADD COLUMN dispatched_at timestamp with time zone;
ALTER TABLE public.op_irregularities ADD COLUMN estimated_time_minutes integer DEFAULT 30;
ALTER TABLE public.op_irregularities ADD COLUMN dispatch_priority integer DEFAULT 5;
ALTER TABLE public.op_irregularities ADD COLUMN assigned_user_ids uuid[] DEFAULT '{}'::uuid[];
ALTER TABLE public.op_irregularities ADD COLUMN scheduled_dates date[] DEFAULT '{}'::date[];
ALTER TABLE public.op_irregularities ADD COLUMN task_name text;
CREATE POLICY "Admin/Manager can delete op_irregularities"
ON public.op_irregularities
FOR DELETE
TO authenticated
USING (
  (establishment_id = op_get_user_establishment_id(auth.uid()))
  AND (op_is_admin_or_manager(auth.uid()) OR reported_by_user_id = auth.uid())
);
CREATE OR REPLACE FUNCTION public.op_auto_deactivate_irregularity_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_id uuid;
  v_is_irregularity boolean;
  v_total_pending integer;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('completed', 'not_done') THEN
    RETURN NEW;
  END IF;
  v_template_id := NEW.task_template_id;
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT is_irregularity_template INTO v_is_irregularity
  FROM op_task_templates
  WHERE id = v_template_id;
  IF v_is_irregularity IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO v_total_pending
  FROM op_task_executions
  WHERE task_template_id = v_template_id
    AND id != NEW.id
    AND status IN ('pending', 'in_progress', 'delayed');
  IF v_total_pending = 0 THEN
    UPDATE op_task_templates
    SET is_active = false, updated_at = now()
    WHERE id = v_template_id;
    UPDATE op_irregularities
    SET status = 'resolved', updated_at = now()
    WHERE task_execution_id IN (
      SELECT id FROM op_task_executions WHERE task_template_id = v_template_id
    )
    AND status != 'resolved';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_deactivate_irregularity_template
  AFTER UPDATE OF status ON public.op_task_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.op_auto_deactivate_irregularity_template();
DROP POLICY IF EXISTS "Admin/Manager can manage op_task_template_materials" ON public.op_task_template_materials;
DROP POLICY IF EXISTS "Authenticated users can view op_task_template_materials" ON public.op_task_template_materials;
CREATE POLICY "Admin/Manager can manage op_task_template_materials"
ON public.op_task_template_materials
FOR ALL
TO authenticated
USING (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()))
WITH CHECK (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_template_materials"
ON public.op_task_template_materials
FOR SELECT
TO authenticated
USING (true);
DROP POLICY IF EXISTS "Admin/Manager can manage op_task_template_tools" ON public.op_task_template_tools;
DROP POLICY IF EXISTS "Authenticated users can view op_task_template_tools" ON public.op_task_template_tools;
CREATE POLICY "Admin/Manager can manage op_task_template_tools"
ON public.op_task_template_tools
FOR ALL
TO authenticated
USING (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()))
WITH CHECK (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_template_tools"
ON public.op_task_template_tools
FOR SELECT
TO authenticated
USING (true);
DROP POLICY IF EXISTS "Admin/Manager can manage op_task_dependencies" ON public.op_task_dependencies;
CREATE POLICY "Admin/Manager can manage op_task_dependencies"
ON public.op_task_dependencies
FOR ALL
TO authenticated
USING (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()))
WITH CHECK (op_is_admin_or_manager(auth.uid()) OR op_is_super_admin(auth.uid()));
UPDATE op_task_executions te
SET establishment_id = tt.establishment_id
FROM op_task_templates tt
WHERE te.task_template_id = tt.id
  AND te.establishment_id IS NULL
  AND tt.establishment_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.op_auto_fill_task_execution_establishment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.establishment_id IS NULL AND NEW.task_template_id IS NOT NULL THEN
    SELECT establishment_id INTO NEW.establishment_id
    FROM op_task_templates
    WHERE id = NEW.task_template_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_fill_task_execution_establishment
  BEFORE INSERT ON public.op_task_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.op_auto_fill_task_execution_establishment();
DELETE FROM op_task_dependencies
WHERE id IN (
  SELECT CASE 
    WHEN a.id > b.id THEN a.id 
    ELSE b.id 
  END
  FROM op_task_dependencies a
  JOIN op_task_dependencies b 
    ON a.task_template_id = b.depends_on_template_id 
    AND a.depends_on_template_id = b.task_template_id
    AND a.id < b.id
);
DROP POLICY IF EXISTS "Authenticated users can view op_task_dependencies" ON public.op_task_dependencies;
CREATE POLICY "Authenticated users can view op_task_dependencies"
ON public.op_task_dependencies
FOR SELECT
TO authenticated
USING (true);
DROP POLICY IF EXISTS "Admin/Manager can manage departures" ON public.op_function_departures;
CREATE POLICY "Admin/Manager can manage departures in establishment"
ON public.op_function_departures
FOR ALL
TO authenticated
USING (
  public.op_is_super_admin(auth.uid())
  OR (
    public.op_is_admin_or_manager(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.op_profiles p
      WHERE p.user_id = op_function_departures.user_id
        AND p.establishment_id = public.op_get_user_establishment_id(auth.uid())
    )
  )
)
WITH CHECK (
  public.op_is_super_admin(auth.uid())
  OR (
    public.op_is_admin_or_manager(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.op_profiles p
      WHERE p.user_id = op_function_departures.user_id
        AND p.establishment_id = public.op_get_user_establishment_id(auth.uid())
    )
  )
);
DROP POLICY IF EXISTS "Users can view departures" ON public.op_function_departures;
CREATE POLICY "Users can view departures"
ON public.op_function_departures
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.op_is_super_admin(auth.uid())
  OR (
    public.op_is_admin_or_manager(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.op_profiles p
      WHERE p.user_id = op_function_departures.user_id
        AND p.establishment_id = public.op_get_user_establishment_id(auth.uid())
    )
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_absences TO authenticated;
GRANT ALL ON public.op_absences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_alerts TO authenticated;
GRANT ALL ON public.op_alerts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_incidents TO authenticated;
GRANT ALL ON public.op_incidents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_irregularities TO authenticated;
GRANT ALL ON public.op_irregularities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_job_functions TO authenticated;
GRANT ALL ON public.op_job_functions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_material_consumption TO authenticated;
GRANT ALL ON public.op_material_consumption TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_materials TO authenticated;
GRANT ALL ON public.op_materials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_operational_conditions TO authenticated;
GRANT ALL ON public.op_operational_conditions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_productivity_metrics TO authenticated;
GRANT ALL ON public.op_productivity_metrics TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_sectors TO authenticated;
GRANT ALL ON public.op_sectors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_shifts TO authenticated;
GRANT ALL ON public.op_shifts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_dependencies TO authenticated;
GRANT ALL ON public.op_task_dependencies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_executions TO authenticated;
GRANT ALL ON public.op_task_executions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_templates TO authenticated;
GRANT ALL ON public.op_task_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_template_materials TO authenticated;
GRANT ALL ON public.op_task_template_materials TO service_role;
GRANT SELECT ON public.op_user_roles TO authenticated;
GRANT ALL ON public.op_user_roles TO service_role;
REVOKE SELECT ON public.op_profiles FROM authenticated;
REVOKE SELECT ON public.op_profiles FROM anon;
GRANT SELECT (
  id, user_id, full_name, job_function_id, shift_id, establishment_id,
  is_active, is_on_vacation, created_at, updated_at
) ON public.op_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.op_profiles TO authenticated;
GRANT ALL ON public.op_profiles TO service_role;
CREATE OR REPLACE FUNCTION public.op_get_my_profile_flags()
RETURNS TABLE(access_level_id uuid, can_delete_incidents boolean, can_approve_irregularities boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.access_level_id, p.can_delete_incidents, p.can_approve_irregularities
  FROM public.op_profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.op_get_profile_admin_details(p_profile_id uuid)
RETURNS TABLE(access_level_id uuid, can_delete_incidents boolean, can_approve_irregularities boolean, phone text, login_email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.op_is_admin_or_manager(auth.uid()) OR public.op_is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT p.access_level_id, p.can_delete_incidents, p.can_approve_irregularities, p.phone, p.login_email
  FROM public.op_profiles p
  WHERE p.id = p_profile_id
    AND (public.op_is_super_admin(auth.uid())
         OR p.establishment_id = public.op_get_user_establishment_id(auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.op_get_my_profile_flags() FROM public, anon;
REVOKE ALL ON FUNCTION public.op_get_profile_admin_details(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.op_get_my_profile_flags() TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_get_profile_admin_details(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.op_calculate_smart_priority(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_get_login_email_by_name(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_auto_deactivate_irregularity_template() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_auto_fill_task_execution_establishment() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_handle_material_movement() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_sync_multi_person_task_status() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.op_has_role(uuid, op_app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.op_is_admin_or_manager(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.op_is_super_admin(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.op_get_user_establishment_id(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.op_get_user_establishments(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.op_can_view_task_execution(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.op_has_role(uuid, op_app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_is_admin_or_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_get_user_establishment_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_get_user_establishments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.op_can_view_task_execution(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.op_get_login_options_by_name(text) FROM public;
GRANT EXECUTE ON FUNCTION public.op_get_login_options_by_name(text) TO anon, authenticated;
DROP POLICY IF EXISTS "Allow public read access to task-location-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to task-location-photos" ON storage.objects;
CREATE POLICY "Users upload own app photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('task-photos', 'task-location-photos', 'irregularity-photos')
  AND owner = auth.uid()
  AND EXISTS (SELECT 1 FROM public.op_profiles p WHERE p.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Allow authenticated updates to task-location-photos" ON storage.objects;
CREATE POLICY "Owners or admins update app photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('task-photos', 'task-location-photos', 'irregularity-photos')
  AND (owner = auth.uid() OR public.op_is_admin_or_manager(auth.uid()) OR public.op_is_super_admin(auth.uid()))
)
WITH CHECK (
  bucket_id IN ('task-photos', 'task-location-photos', 'irregularity-photos')
  AND (owner = auth.uid() OR public.op_is_admin_or_manager(auth.uid()) OR public.op_is_super_admin(auth.uid()))
);
DROP POLICY IF EXISTS "Allow authenticated deletes from task-location-photos" ON storage.objects;
CREATE POLICY "Owners or admins delete app photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('task-photos', 'task-location-photos', 'irregularity-photos')
  AND (owner = auth.uid() OR public.op_is_admin_or_manager(auth.uid()) OR public.op_is_super_admin(auth.uid()))
);