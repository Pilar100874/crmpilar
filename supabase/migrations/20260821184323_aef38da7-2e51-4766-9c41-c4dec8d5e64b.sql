CREATE TYPE public.op_task_frequency AS ENUM ('daily', 'weekly', 'monthly', 'on_demand');
CREATE TYPE public.op_task_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed', 'not_done');
CREATE TYPE public.op_app_role AS ENUM ('admin', 'manager', 'worker');
CREATE TABLE public.op_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_job_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_id UUID REFERENCES public.op_sectors(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  job_function_id UUID REFERENCES public.op_job_functions(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.op_shifts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role op_app_role NOT NULL DEFAULT 'worker',
  UNIQUE(user_id, role)
);
CREATE TABLE public.op_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  sector_id UUID REFERENCES public.op_sectors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sector_id UUID REFERENCES public.op_sectors(id) ON DELETE SET NULL,
  job_function_id UUID REFERENCES public.op_job_functions(id) ON DELETE SET NULL,
  checklist JSONB DEFAULT '[]'::jsonb,
  estimated_time_minutes INTEGER DEFAULT 30,
  frequency op_task_frequency NOT NULL DEFAULT 'daily',
  requires_photo BOOLEAN DEFAULT true,
  requires_before_after_photo BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_task_template_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID REFERENCES public.op_task_templates(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.op_materials(id) ON DELETE CASCADE NOT NULL,
  quantity_needed NUMERIC DEFAULT 1,
  UNIQUE(task_template_id, material_id)
);
CREATE TABLE public.op_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID REFERENCES public.op_task_templates(id) ON DELETE SET NULL NOT NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status op_task_status DEFAULT 'pending',
  checklist_progress JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER,
  photo_before_url TEXT,
  photo_after_url TEXT,
  photo_completion_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_material_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_execution_id UUID REFERENCES public.op_task_executions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.op_materials(id) ON DELETE SET NULL NOT NULL,
  quantity_used NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.op_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.op_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_job_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_task_template_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.op_alerts ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.op_has_role(_user_id UUID, _role op_app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.op_user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
CREATE OR REPLACE FUNCTION public.op_is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.op_user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;
CREATE POLICY "Authenticated users can view op_sectors"
  ON public.op_sectors FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_sectors"
  ON public.op_sectors FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_job_functions"
  ON public.op_job_functions FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_job_functions"
  ON public.op_job_functions FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_shifts"
  ON public.op_shifts FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_shifts"
  ON public.op_shifts FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can view all op_profiles"
  ON public.op_profiles FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Users can update own profile"
  ON public.op_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile"
  ON public.op_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/Manager can manage all op_profiles"
  ON public.op_profiles FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can view own role"
  ON public.op_user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin can manage roles"
  ON public.op_user_roles FOR ALL
  TO authenticated
  USING (public.op_has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view op_materials"
  ON public.op_materials FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_materials"
  ON public.op_materials FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_templates"
  ON public.op_task_templates FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_task_templates"
  ON public.op_task_templates FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_template_materials"
  ON public.op_task_template_materials FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_task_template_materials"
  ON public.op_task_template_materials FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can view op_task_executions"
  ON public.op_task_executions FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Users can update assigned tasks"
  ON public.op_task_executions FOR UPDATE
  TO authenticated
  USING (assigned_user_id = auth.uid() OR public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/Manager can manage op_task_executions"
  ON public.op_task_executions FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_material_consumption"
  ON public.op_material_consumption FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Users can insert op_material_consumption"
  ON public.op_material_consumption FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/Manager can manage op_material_consumption"
  ON public.op_material_consumption FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_alerts"
  ON public.op_alerts FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admin/Manager can manage op_alerts"
  ON public.op_alerts FOR ALL
  TO authenticated
  USING (public.op_is_admin_or_manager(auth.uid()));
CREATE OR REPLACE FUNCTION public.op_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.op_sectors FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE TRIGGER update_job_functions_updated_at BEFORE UPDATE ON public.op_job_functions FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.op_profiles FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.op_materials FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.op_task_templates FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON public.op_task_executions FOR EACH ROW EXECUTE FUNCTION public.op_set_updated_at();
CREATE OR REPLACE FUNCTION public.op_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.op_profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.op_user_roles (user_id, role)
  VALUES (NEW.id, 'worker');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE INDEX idx_op_task_executions_scheduled_date ON public.op_task_executions(scheduled_date);
CREATE INDEX idx_op_task_executions_status ON public.op_task_executions(status);
CREATE INDEX idx_op_task_executions_assigned_user ON public.op_task_executions(assigned_user_id);
CREATE INDEX idx_op_profiles_user_id ON public.op_profiles(user_id);
CREATE INDEX idx_op_materials_sector ON public.op_materials(sector_id);
CREATE POLICY "Anyone can view task photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');
CREATE POLICY "Authenticated users can upload task photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');
CREATE POLICY "Users can update own task photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'task-photos');
CREATE POLICY "Admin/Manager can delete task photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-photos');
ALTER TABLE public.op_task_templates 
ADD COLUMN IF NOT EXISTS sla_minutes integer DEFAULT 480,
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS min_execution_minutes integer DEFAULT 5;
CREATE TABLE IF NOT EXISTS public.op_task_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_template_id uuid NOT NULL REFERENCES public.op_task_templates(id) ON DELETE CASCADE,
  depends_on_template_id uuid NOT NULL REFERENCES public.op_task_templates(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(task_template_id, depends_on_template_id)
);
ALTER TABLE public.op_task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager can manage op_task_dependencies" 
ON public.op_task_dependencies FOR ALL 
USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_task_dependencies" 
ON public.op_task_dependencies FOR SELECT 
USING (true);
ALTER TABLE public.op_task_executions 
ADD COLUMN IF NOT EXISTS photo_hash text,
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicious_reason text,
ADD COLUMN IF NOT EXISTS expected_latitude numeric,
ADD COLUMN IF NOT EXISTS expected_longitude numeric,
ADD COLUMN IF NOT EXISTS location_radius_meters integer DEFAULT 500;
ALTER TABLE public.op_task_executions 
ADD COLUMN IF NOT EXISTS original_assigned_user_id uuid,
ADD COLUMN IF NOT EXISTS was_redistributed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 50;
ALTER TABLE public.op_material_consumption 
ADD COLUMN IF NOT EXISTS notes text;
CREATE TABLE IF NOT EXISTS public.op_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  sector_id uuid REFERENCES public.op_sectors(id),
  reported_by_user_id uuid,
  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL DEFAULT 'medium',
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.op_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager can manage op_incidents" 
ON public.op_incidents FOR ALL 
USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Authenticated users can view op_incidents" 
ON public.op_incidents FOR SELECT 
USING (true);
CREATE POLICY "Users can create op_incidents" 
ON public.op_incidents FOR INSERT 
WITH CHECK (reported_by_user_id = auth.uid());
CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.op_incidents
FOR EACH ROW
EXECUTE FUNCTION public.op_set_updated_at();
CREATE TABLE IF NOT EXISTS public.op_absences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  absence_date date NOT NULL,
  reason text,
  is_planned boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, absence_date)
);
ALTER TABLE public.op_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Manager can manage op_absences" 
ON public.op_absences FOR ALL 
USING (op_is_admin_or_manager(auth.uid()));
CREATE POLICY "Users can view op_absences" 
ON public.op_absences FOR SELECT 
USING (true);
CREATE OR REPLACE FUNCTION public.op_calculate_task_priority(
  p_task_execution_id uuid
)
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
BEGIN
  SELECT 
    te.status,
    te.started_at,
    tt.priority,
    tt.sla_minutes
  INTO v_status, v_started_at, v_template_priority, v_sla_minutes
  FROM op_task_executions te
  JOIN op_task_templates tt ON te.task_template_id = tt.id
  WHERE te.id = p_task_execution_id;
  v_priority := COALESCE(v_template_priority, 5) * 10;
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
  RETURN LEAST(v_priority, 100);
END;
$$;
CREATE TABLE public.op_irregularities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  sector_id UUID REFERENCES public.op_sectors(id),
  reported_by_user_id UUID,
  location_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'task_created', 'resolved')),
  task_execution_id UUID REFERENCES public.op_task_executions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_irregularities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view op_irregularities"
ON public.op_irregularities FOR SELECT
TO authenticated
USING (true);
CREATE TRIGGER update_irregularities_updated_at
BEFORE UPDATE ON public.op_irregularities
FOR EACH ROW
EXECUTE FUNCTION public.op_set_updated_at();
CREATE POLICY "Irregularity photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'irregularity-photos');
CREATE POLICY "Authenticated users can upload irregularity photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'irregularity-photos');
CREATE POLICY "Authenticated users can create op_irregularities"
ON public.op_irregularities FOR INSERT
TO authenticated
WITH CHECK (reported_by_user_id = auth.uid());
CREATE POLICY "Users or admins can update op_irregularities"
ON public.op_irregularities FOR UPDATE
TO authenticated
USING (reported_by_user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()));
CREATE TABLE public.op_operational_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('weather', 'access', 'safety', 'equipment', 'other')),
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  affected_sectors UUID[] DEFAULT '{}',
  affects_outdoor_tasks BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expected_end_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.op_operational_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view conditions"
ON public.op_operational_conditions FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "Admin/Manager can manage conditions"
ON public.op_operational_conditions FOR ALL
TO authenticated
USING (op_is_admin_or_manager(auth.uid()));
CREATE TRIGGER update_operational_conditions_updated_at
BEFORE UPDATE ON public.op_operational_conditions
FOR EACH ROW
EXECUTE FUNCTION public.op_set_updated_at();
ALTER TABLE public.op_task_executions 
ADD COLUMN IF NOT EXISTS quality_score INTEGER,
ADD COLUMN IF NOT EXISTS blocked_by_condition_id UUID REFERENCES public.op_operational_conditions(id),
ADD COLUMN IF NOT EXISTS is_outdoor_task BOOLEAN DEFAULT false;
ALTER TABLE public.op_task_templates
ADD COLUMN IF NOT EXISTS is_outdoor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS required_materials_check BOOLEAN DEFAULT true;
CREATE TABLE public.op_productivity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_not_done INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  average_quality_score NUMERIC(5,2),
  on_time_percentage NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, metric_date)
);
ALTER TABLE public.op_productivity_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own metrics"
ON public.op_productivity_metrics FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR op_is_admin_or_manager(auth.uid()));
CREATE POLICY "System can insert metrics"
ON public.op_productivity_metrics FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "System can update metrics"
ON public.op_productivity_metrics FOR UPDATE
TO authenticated
USING (true);
CREATE TRIGGER update_productivity_metrics_updated_at
BEFORE UPDATE ON public.op_productivity_metrics
FOR EACH ROW
EXECUTE FUNCTION public.op_set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_sectors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_job_functions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_template_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_material_consumption TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_task_dependencies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_absences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_irregularities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_operational_conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_productivity_metrics TO authenticated;
GRANT ALL ON public.op_sectors, public.op_job_functions, public.op_shifts, public.op_profiles, public.op_user_roles, public.op_materials, public.op_task_templates, public.op_task_template_materials, public.op_task_executions, public.op_material_consumption, public.op_alerts, public.op_task_dependencies, public.op_incidents, public.op_absences, public.op_irregularities, public.op_operational_conditions, public.op_productivity_metrics TO service_role;