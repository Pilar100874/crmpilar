DROP POLICY IF EXISTS "Authenticated users can view op_establishments" ON public.op_establishments;
DROP POLICY IF EXISTS "Admin/Manager can manage op_establishments" ON public.op_establishments;
ALTER TABLE public.op_daily_attendance ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_operational_conditions ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_productivity_metrics ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
UPDATE public.op_profiles SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_sectors SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_job_functions SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_shifts SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_task_templates SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_task_executions SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_materials SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_material_movements SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_material_consumption SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_tools SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_alerts SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_incidents SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_irregularities SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_frequencies SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_absences SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_daily_attendance SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_operational_conditions SET establishment_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.op_productivity_metrics SET establishment_id = '00000000-0000-0000-0000-000000000001';
CREATE OR REPLACE FUNCTION public.op_get_user_establishment_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id
  FROM public.op_profiles
  WHERE user_id = _user_id
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.op_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.op_user_roles
    WHERE user_id = _user_id
      AND role::text = 'super_admin'
  );
END;
$$;
CREATE POLICY "Super admin can manage op_establishments"
  ON public.op_establishments FOR ALL
  USING (op_is_super_admin(auth.uid()));
CREATE POLICY "Users can view own establishment"
  ON public.op_establishments FOR SELECT
  USING (id = op_get_user_establishment_id(auth.uid()) OR op_is_super_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.op_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.op_profiles (user_id, full_name, establishment_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    (NEW.raw_user_meta_data->>'establishment_id')::uuid
  );
  INSERT INTO public.op_user_roles (user_id, role)
  VALUES (NEW.id, 'worker');
  RETURN NEW;
END;
$$;
DROP POLICY IF EXISTS "Admin/Manager can manage all op_profiles" ON public.op_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.op_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.op_profiles;
DROP POLICY IF EXISTS "Users can view all op_profiles" ON public.op_profiles;
CREATE POLICY "Users can view op_profiles in own establishment" ON public.op_profiles
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_profiles in establishment" ON public.op_profiles
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert own profile" ON public.op_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.op_profiles
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin/Manager can manage op_sectors" ON public.op_sectors;
DROP POLICY IF EXISTS "Authenticated users can view op_sectors" ON public.op_sectors;
CREATE POLICY "View op_sectors in establishment" ON public.op_sectors
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_sectors" ON public.op_sectors
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_job_functions" ON public.op_job_functions;
DROP POLICY IF EXISTS "Authenticated users can view op_job_functions" ON public.op_job_functions;
CREATE POLICY "View op_job_functions in establishment" ON public.op_job_functions
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_job_functions" ON public.op_job_functions
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_shifts" ON public.op_shifts;
DROP POLICY IF EXISTS "Authenticated users can view op_shifts" ON public.op_shifts;
CREATE POLICY "View op_shifts in establishment" ON public.op_shifts
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_shifts" ON public.op_shifts
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_task_templates" ON public.op_task_templates;
DROP POLICY IF EXISTS "Admin/Manager can delete op_task_templates" ON public.op_task_templates;
DROP POLICY IF EXISTS "Authenticated users can view op_task_templates" ON public.op_task_templates;
CREATE POLICY "View op_task_templates in establishment" ON public.op_task_templates
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_task_templates" ON public.op_task_templates
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_task_executions" ON public.op_task_executions;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.op_task_executions;
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.op_task_executions;
CREATE POLICY "View op_task_executions in establishment" ON public.op_task_executions
  FOR SELECT USING (
    (establishment_id = op_get_user_establishment_id(auth.uid())
      AND (
        assigned_user_id = auth.uid()
        OR op_is_admin_or_manager(auth.uid())
        OR (assigned_user_id IS NULL AND task_template_id IN (
          SELECT tt.id FROM op_task_templates tt, (op_profiles p LEFT JOIN op_job_functions jf ON jf.id = p.job_function_id)
          WHERE p.user_id = auth.uid()
          AND ((tt.job_function_id IS NULL AND tt.sector_id IS NOT NULL AND jf.sector_id = tt.sector_id)
            OR (tt.job_function_id IS NOT NULL AND tt.job_function_id = p.job_function_id))
        ))
      )
    )
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_task_executions" ON public.op_task_executions
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update assigned tasks" ON public.op_task_executions
  FOR UPDATE USING (
    assigned_user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_materials" ON public.op_materials;
DROP POLICY IF EXISTS "Authenticated users can view op_materials" ON public.op_materials;
CREATE POLICY "View op_materials in establishment" ON public.op_materials
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_materials" ON public.op_materials
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_material_movements" ON public.op_material_movements;
DROP POLICY IF EXISTS "Authenticated users can view op_material_movements" ON public.op_material_movements;
DROP POLICY IF EXISTS "Users can insert op_material_movements" ON public.op_material_movements;
CREATE POLICY "View op_material_movements in establishment" ON public.op_material_movements
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_material_movements" ON public.op_material_movements
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert op_material_movements" ON public.op_material_movements
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_material_consumption" ON public.op_material_consumption;
DROP POLICY IF EXISTS "Authenticated users can view op_material_consumption" ON public.op_material_consumption;
DROP POLICY IF EXISTS "Users can insert op_material_consumption" ON public.op_material_consumption;
CREATE POLICY "View op_material_consumption in establishment" ON public.op_material_consumption
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_material_consumption" ON public.op_material_consumption
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert op_material_consumption" ON public.op_material_consumption
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_tools" ON public.op_tools;
DROP POLICY IF EXISTS "Authenticated users can view op_tools" ON public.op_tools;
CREATE POLICY "View op_tools in establishment" ON public.op_tools
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_tools" ON public.op_tools
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_alerts" ON public.op_alerts;
DROP POLICY IF EXISTS "Authenticated users can view op_alerts" ON public.op_alerts;
CREATE POLICY "View op_alerts in establishment" ON public.op_alerts
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_alerts" ON public.op_alerts
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_incidents" ON public.op_incidents;
DROP POLICY IF EXISTS "Authenticated users can view op_incidents" ON public.op_incidents;
DROP POLICY IF EXISTS "Users can create op_incidents" ON public.op_incidents;
DROP POLICY IF EXISTS "Users with permission can delete op_incidents" ON public.op_incidents;
CREATE POLICY "View op_incidents in establishment" ON public.op_incidents
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_incidents" ON public.op_incidents
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create op_incidents" ON public.op_incidents
  FOR INSERT WITH CHECK (
    reported_by_user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE POLICY "Users with permission can delete op_incidents" ON public.op_incidents
  FOR DELETE USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    AND (op_is_admin_or_manager(auth.uid()) OR EXISTS (
      SELECT 1 FROM op_profiles WHERE op_profiles.user_id = auth.uid() AND op_profiles.can_delete_incidents = true
    ))
  );
DROP POLICY IF EXISTS "Authenticated users can create op_irregularities" ON public.op_irregularities;
DROP POLICY IF EXISTS "Authenticated users can view op_irregularities" ON public.op_irregularities;
DROP POLICY IF EXISTS "Users or admins can update op_irregularities" ON public.op_irregularities;
CREATE POLICY "View op_irregularities in establishment" ON public.op_irregularities
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create op_irregularities" ON public.op_irregularities
  FOR INSERT WITH CHECK (
    reported_by_user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE POLICY "Users or admins can update op_irregularities" ON public.op_irregularities
  FOR UPDATE USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    AND (reported_by_user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()))
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_frequencies" ON public.op_frequencies;
DROP POLICY IF EXISTS "Authenticated users can view op_frequencies" ON public.op_frequencies;
CREATE POLICY "View op_frequencies in establishment" ON public.op_frequencies
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_frequencies" ON public.op_frequencies
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage op_absences" ON public.op_absences;
DROP POLICY IF EXISTS "Users can view op_absences" ON public.op_absences;
CREATE POLICY "View op_absences in establishment" ON public.op_absences
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage op_absences" ON public.op_absences
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage attendance" ON public.op_daily_attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.op_daily_attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.op_daily_attendance;
DROP POLICY IF EXISTS "Users can view attendance" ON public.op_daily_attendance;
CREATE POLICY "View attendance in establishment" ON public.op_daily_attendance
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage attendance" ON public.op_daily_attendance
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert own attendance" ON public.op_daily_attendance
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE POLICY "Users can update own attendance" ON public.op_daily_attendance
  FOR UPDATE USING (
    user_id = auth.uid()
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
DROP POLICY IF EXISTS "Admin/Manager can manage conditions" ON public.op_operational_conditions;
DROP POLICY IF EXISTS "Authenticated users can view conditions" ON public.op_operational_conditions;
CREATE POLICY "View conditions in establishment" ON public.op_operational_conditions
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Admin/Manager can manage conditions" ON public.op_operational_conditions
  FOR ALL USING (
    (op_is_admin_or_manager(auth.uid()) AND establishment_id = op_get_user_establishment_id(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
DROP POLICY IF EXISTS "Users can insert own metrics" ON public.op_productivity_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON public.op_productivity_metrics;
DROP POLICY IF EXISTS "Users can view own metrics" ON public.op_productivity_metrics;
CREATE POLICY "View metrics in establishment" ON public.op_productivity_metrics
  FOR SELECT USING (
    establishment_id = op_get_user_establishment_id(auth.uid())
    AND (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()))
    OR op_is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert own metrics" ON public.op_productivity_metrics
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()))
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE POLICY "Users can update own metrics" ON public.op_productivity_metrics
  FOR UPDATE USING (
    (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()))
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE TABLE public.op_user_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  establishment_id uuid NOT NULL REFERENCES public.op_establishments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, establishment_id)
);
ALTER TABLE public.op_user_establishments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_user_establishments TO authenticated;
GRANT ALL ON public.op_user_establishments TO service_role;
CREATE POLICY "Super admin can manage op_user_establishments"
  ON public.op_user_establishments FOR ALL
  USING (op_is_super_admin(auth.uid()));
CREATE POLICY "Admin can manage op_user_establishments in own establishment"
  ON public.op_user_establishments FOR ALL
  USING (
    op_is_admin_or_manager(auth.uid()) 
    AND establishment_id = op_get_user_establishment_id(auth.uid())
  );
CREATE POLICY "Users can view own op_establishments"
  ON public.op_user_establishments FOR SELECT
  USING (user_id = auth.uid());
INSERT INTO public.op_user_establishments (user_id, establishment_id)
SELECT DISTINCT p.user_id, p.establishment_id
FROM public.op_profiles p
WHERE p.establishment_id IS NOT NULL
ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.op_get_user_establishments(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id
  FROM public.op_user_establishments
  WHERE user_id = _user_id;
$$;
CREATE OR REPLACE FUNCTION public.op_get_login_options_by_name(p_name text)
RETURNS TABLE(login_email text, establishment_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.login_email, COALESCE(e.name, 'Sem estabelecimento') as establishment_name
  FROM public.op_profiles p
  LEFT JOIN public.op_user_establishments ue ON ue.user_id = p.user_id
  LEFT JOIN public.op_establishments e ON e.id = ue.establishment_id
  WHERE lower(p.full_name) = lower(p_name)
    AND p.is_active = true
    AND p.login_email IS NOT NULL;
$$;
DROP POLICY IF EXISTS "Users can view own establishment" ON public.op_establishments;
CREATE POLICY "Users can view op_establishments"
ON public.op_establishments
FOR SELECT
TO authenticated
USING (
  id IN (SELECT establishment_id FROM public.op_user_establishments WHERE user_id = auth.uid())
  OR op_is_admin_or_manager(auth.uid())
  OR op_is_super_admin(auth.uid())
);