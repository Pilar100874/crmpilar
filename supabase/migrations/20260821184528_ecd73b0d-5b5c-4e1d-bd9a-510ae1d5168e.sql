CREATE OR REPLACE FUNCTION public.op_calculate_smart_priority(p_task_execution_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority integer := 50;
  v_template_priority integer;
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
    tt.sla_minutes,
    tt.is_outdoor,
    tt.sector_id
  INTO v_status, v_started_at, v_template_priority, v_sla_minutes, v_is_outdoor, v_sector_id
  FROM op_task_executions te
  JOIN op_task_templates tt ON te.task_template_id = tt.id
  WHERE te.id = p_task_execution_id;
  v_priority := COALESCE(v_template_priority, 5) * 10;
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
DROP POLICY IF EXISTS "System can insert metrics" ON public.op_productivity_metrics;
DROP POLICY IF EXISTS "System can update metrics" ON public.op_productivity_metrics;
CREATE POLICY "Users can insert own metrics"
ON public.op_productivity_metrics FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can update own metrics"
ON public.op_productivity_metrics FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()));
ALTER TABLE public.op_profiles ADD COLUMN login_email text;
CREATE INDEX idx_op_profiles_full_name ON public.op_profiles (full_name);
CREATE INDEX idx_op_profiles_login_email ON public.op_profiles (login_email);
CREATE OR REPLACE FUNCTION public.op_get_login_email_by_name(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT login_email
  FROM public.op_profiles
  WHERE lower(full_name) = lower(p_name)
    AND is_active = true
    AND login_email IS NOT NULL
  LIMIT 1;
$$;
CREATE TABLE public.op_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  checked_in_at timestamp with time zone DEFAULT now(),
  checked_out_at timestamp with time zone,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, attendance_date)
);
ALTER TABLE public.op_daily_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view attendance"
ON public.op_daily_attendance FOR SELECT
USING (true);
CREATE POLICY "Users can insert own attendance"
ON public.op_daily_attendance FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own attendance"
ON public.op_daily_attendance FOR UPDATE
USING (user_id = auth.uid());
CREATE POLICY "Admin/Manager can manage attendance"
ON public.op_daily_attendance FOR ALL
USING (op_is_admin_or_manager(auth.uid()));
ALTER TABLE public.op_task_templates 
ADD COLUMN default_assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.op_task_templates 
ADD COLUMN location_photos text[] DEFAULT '{}';
CREATE POLICY "Allow authenticated uploads to task-location-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-location-photos');
CREATE POLICY "Allow public read access to task-location-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-location-photos');
CREATE POLICY "Allow authenticated updates to task-location-photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'task-location-photos');
CREATE POLICY "Allow authenticated deletes from task-location-photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-location-photos');
ALTER TABLE public.op_task_templates 
ADD COLUMN is_irregularity_template boolean DEFAULT false;
ALTER TABLE public.op_task_executions 
ADD COLUMN target_sector_id uuid REFERENCES public.op_sectors(id) ON DELETE SET NULL;
DROP POLICY IF EXISTS "Users can view op_task_executions" ON public.op_task_executions;
CREATE OR REPLACE FUNCTION public.op_can_view_task_execution(p_task_execution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM op_task_executions te
    LEFT JOIN op_task_templates tt ON te.task_template_id = tt.id
    LEFT JOIN op_profiles p ON p.user_id = auth.uid()
    WHERE te.id = p_task_execution_id
    AND (
      te.assigned_user_id = auth.uid()
      OR op_is_admin_or_manager(auth.uid())
      OR (te.assigned_user_id IS NULL AND tt.job_function_id = p.job_function_id)
    )
  );
$$;
ALTER TABLE public.op_task_executions 
DROP CONSTRAINT IF EXISTS op_task_executions_task_template_id_fkey;
ALTER TABLE public.op_task_executions 
ADD CONSTRAINT op_task_executions_task_template_id_fkey 
FOREIGN KEY (task_template_id) 
REFERENCES public.op_task_templates(id) 
ON DELETE CASCADE;
ALTER TABLE public.op_task_template_materials 
DROP CONSTRAINT IF EXISTS op_task_template_materials_task_template_id_fkey;
ALTER TABLE public.op_task_template_materials 
ADD CONSTRAINT op_task_template_materials_task_template_id_fkey 
FOREIGN KEY (task_template_id) 
REFERENCES public.op_task_templates(id) 
ON DELETE CASCADE;
ALTER TABLE public.op_task_dependencies 
DROP CONSTRAINT IF EXISTS op_task_dependencies_task_template_id_fkey;
ALTER TABLE public.op_task_dependencies 
ADD CONSTRAINT op_task_dependencies_task_template_id_fkey 
FOREIGN KEY (task_template_id) 
REFERENCES public.op_task_templates(id) 
ON DELETE CASCADE;
ALTER TABLE public.op_task_dependencies 
DROP CONSTRAINT IF EXISTS op_task_dependencies_depends_on_template_id_fkey;
ALTER TABLE public.op_task_dependencies 
ADD CONSTRAINT op_task_dependencies_depends_on_template_id_fkey 
FOREIGN KEY (depends_on_template_id) 
REFERENCES public.op_task_templates(id) 
ON DELETE CASCADE;
DROP POLICY IF EXISTS "Admin/Manager can delete op_task_templates" ON public.op_task_templates;
CREATE POLICY "Admin/Manager can delete op_task_templates"
ON public.op_task_templates FOR DELETE TO authenticated
USING (op_is_admin_or_manager(auth.uid()));
CREATE TABLE public.op_function_departures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  departure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  observations TEXT,
  tasks_redistributed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_function_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own departures"
ON public.op_function_departures
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view departures"
ON public.op_function_departures
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/Manager can manage departures"
ON public.op_function_departures
FOR ALL
TO authenticated
USING (op_is_admin_or_manager(auth.uid()));
ALTER TABLE public.op_profiles ADD COLUMN is_on_vacation boolean NOT NULL DEFAULT false;
ALTER TABLE public.op_shifts ADD COLUMN work_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}';
ALTER TABLE public.op_shifts ADD COLUMN day_schedules jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.op_shifts 
  ADD COLUMN lunch_start time without time zone DEFAULT NULL,
  ADD COLUMN lunch_end time without time zone DEFAULT NULL;
ALTER TABLE public.op_task_templates
  ADD COLUMN requires_rest_after boolean NOT NULL DEFAULT false,
  ADD COLUMN rest_minutes_after integer DEFAULT NULL;
CREATE TABLE public.op_frequencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  interval_days INTEGER,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_frequencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view op_frequencies"
  ON public.op_frequencies FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage op_frequencies"
  ON public.op_frequencies FOR ALL USING (op_is_admin_or_manager(auth.uid()));
CREATE TRIGGER update_frequencies_updated_at
  BEFORE UPDATE ON public.op_frequencies
  FOR EACH ROW
  EXECUTE FUNCTION public.op_set_updated_at();
INSERT INTO public.op_frequencies (name, label, description, interval_days, is_system) VALUES
  ('daily', 'Diária', 'Executada todos os dias', 1, true),
  ('weekly', 'Semanal', 'Executada uma vez por semana', 7, true),
  ('monthly', 'Mensal', 'Executada uma vez por mês', 30, true),
  ('on_demand', 'Sob Demanda', 'Executada quando necessário', NULL, true);
CREATE TABLE public.op_material_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.op_materials(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reason TEXT,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_material_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view op_material_movements"
  ON public.op_material_movements FOR SELECT USING (true);
CREATE POLICY "Admin/Manager can manage op_material_movements"
  ON public.op_material_movements FOR ALL USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can insert op_material_movements"
  ON public.op_material_movements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.op_handle_material_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_stock NUMERIC;
  v_min_stock NUMERIC;
  v_material_name TEXT;
BEGIN
  IF NEW.movement_type = 'entry' THEN
    UPDATE op_materials SET current_stock = COALESCE(current_stock, 0) + NEW.quantity
    WHERE id = NEW.material_id;
  ELSE
    UPDATE op_materials SET current_stock = GREATEST(COALESCE(current_stock, 0) - NEW.quantity, 0)
    WHERE id = NEW.material_id;
  END IF;
  SELECT current_stock, min_stock, name
  INTO v_new_stock, v_min_stock, v_material_name
  FROM op_materials WHERE id = NEW.material_id;
  IF v_new_stock <= v_min_stock AND v_min_stock > 0 THEN
    INSERT INTO op_alerts (type, message, severity, related_entity_id, related_entity_type)
    VALUES (
      'low_stock',
      'Estoque de "' || v_material_name || '" está abaixo do mínimo (' || v_new_stock || '/' || v_min_stock || ')',
      CASE WHEN v_new_stock = 0 THEN 'critical' ELSE 'warning' END,
      NEW.material_id,
      'material'
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_material_movement
  AFTER INSERT ON public.op_material_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.op_handle_material_movement();
ALTER TABLE public.op_task_templates 
  ALTER COLUMN frequency TYPE TEXT USING frequency::TEXT;
ALTER TABLE public.op_task_templates 
  ALTER COLUMN frequency SET DEFAULT 'daily';
DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.op_task_executions;
CREATE POLICY "Users can view relevant tasks"
ON public.op_task_executions
FOR SELECT
USING (
  (assigned_user_id = auth.uid())
  OR op_is_admin_or_manager(auth.uid())
  OR (
    (assigned_user_id IS NULL)
    AND (task_template_id IN (
      SELECT tt.id
      FROM op_task_templates tt, op_profiles p
      LEFT JOIN op_job_functions jf ON jf.id = p.job_function_id
      WHERE p.user_id = auth.uid()
      AND (
        (tt.job_function_id IS NULL AND tt.sector_id IS NOT NULL AND jf.sector_id = tt.sector_id)
        OR (tt.job_function_id IS NOT NULL AND tt.job_function_id = p.job_function_id)
      )
    ))
  )
);
ALTER TABLE public.op_task_templates
ADD COLUMN required_workers integer NOT NULL DEFAULT 1;
ALTER TABLE public.op_task_templates
ADD COLUMN additional_assigned_user_ids uuid[] DEFAULT '{}'::uuid[];
ALTER TABLE public.op_task_executions
ADD COLUMN IF NOT EXISTS carried_over boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_execution_id uuid DEFAULT NULL;
ALTER TABLE public.op_task_executions
  ADD COLUMN IF NOT EXISTS paused_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pause_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pause_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pause_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_start_time time without time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_start_time timestamp with time zone DEFAULT NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.op_task_executions;
CREATE TABLE public.op_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sector_id UUID REFERENCES public.op_sectors(id),
  is_available BOOLEAN NOT NULL DEFAULT true,
  needs_repair BOOLEAN NOT NULL DEFAULT false,
  repair_reported_at TIMESTAMP WITH TIME ZONE,
  repair_reported_by_user_id UUID,
  repair_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager can manage op_tools" ON public.op_tools FOR ALL USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_tools" ON public.op_tools FOR SELECT USING (true);
CREATE TABLE public.op_task_template_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_template_id UUID NOT NULL REFERENCES public.op_task_templates(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.op_tools(id) ON DELETE CASCADE,
  UNIQUE(task_template_id, tool_id)
);
ALTER TABLE public.op_task_template_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager can manage op_task_template_tools" ON public.op_task_template_tools FOR ALL USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_template_tools" ON public.op_task_template_tools FOR SELECT USING (true);
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.op_tools FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
ALTER TABLE public.op_task_templates
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
ADD COLUMN IF NOT EXISTS approved_by_user_id uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.op_profiles
ADD COLUMN IF NOT EXISTS can_approve_irregularities boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_op_task_templates_approval ON public.op_task_templates (approval_status) WHERE is_irregularity_template = true;
ALTER TABLE public.op_task_templates 
ADD COLUMN priority_order integer DEFAULT NULL;
CREATE UNIQUE INDEX idx_op_task_templates_priority_order_unique 
ON public.op_task_templates (priority_order) 
WHERE priority_order IS NOT NULL;
ALTER TABLE public.op_incidents ADD COLUMN resolution_notes text;
ALTER TABLE public.op_profiles ADD COLUMN can_delete_incidents boolean NOT NULL DEFAULT false;
CREATE POLICY "Users with permission can delete op_incidents"
ON public.op_incidents
FOR DELETE
USING (
  op_is_admin_or_manager(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.op_profiles 
    WHERE op_profiles.user_id = auth.uid() 
    AND op_profiles.can_delete_incidents = true
  )
);
ALTER TABLE public.op_task_templates ADD COLUMN work_days integer[] DEFAULT '{1,2,3,4,5}'::integer[];
CREATE TABLE public.op_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.op_establishments ENABLE ROW LEVEL SECURITY;
INSERT INTO public.op_establishments (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Estabelecimento Principal');
ALTER TABLE public.op_profiles ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE SET NULL;
ALTER TABLE public.op_sectors ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_job_functions ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_shifts ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_task_templates ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_task_executions ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_materials ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_material_movements ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_material_consumption ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_tools ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_alerts ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_incidents ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_irregularities ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_frequencies ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
ALTER TABLE public.op_absences ADD COLUMN establishment_id uuid REFERENCES public.op_establishments(id) ON DELETE CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_daily_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_function_departures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_frequencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_material_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_tools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_template_tools TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_establishments TO authenticated;
GRANT ALL ON public.op_daily_attendance, public.op_function_departures, public.op_frequencies, public.op_material_movements, public.op_tools, public.op_task_template_tools, public.op_establishments TO service_role;