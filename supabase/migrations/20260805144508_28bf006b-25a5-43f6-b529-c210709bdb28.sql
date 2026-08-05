CREATE TABLE public.cv_maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.cv_vehicles(id) ON DELETE CASCADE,
  name text NOT NULL,
  tipo text NOT NULL DEFAULT 'km',
  interval_km integer,
  interval_days integer,
  last_done_km integer NOT NULL DEFAULT 0,
  last_done_at timestamptz NOT NULL DEFAULT now(),
  alert_km_antecedencia integer NOT NULL DEFAULT 500,
  alert_days_antecedencia integer NOT NULL DEFAULT 7,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cv_maintenance_plans_tipo_check CHECK (tipo IN ('km','dias','ambos'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_maintenance_plans TO authenticated;
GRANT ALL ON public.cv_maintenance_plans TO service_role;

ALTER TABLE public.cv_maintenance_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_maintenance_plans_tenant" ON public.cv_maintenance_plans
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()));

CREATE INDEX idx_cv_maint_plans_vehicle ON public.cv_maintenance_plans(vehicle_id);
CREATE INDEX idx_cv_maint_plans_estab ON public.cv_maintenance_plans(estabelecimento_id);

CREATE TRIGGER cv_maintenance_plans_updated_at
BEFORE UPDATE ON public.cv_maintenance_plans
FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

ALTER TABLE public.cv_defect_reports
  ADD COLUMN IF NOT EXISTS maintenance_plan_id uuid REFERENCES public.cv_maintenance_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_defects_maint_plan ON public.cv_defect_reports(maintenance_plan_id);

CREATE OR REPLACE FUNCTION public.cv_reset_maintenance_plan_on_resolve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.maintenance_plan_id IS NOT NULL
     AND NEW.status = 'resolved'
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.cv_maintenance_plans p
       SET last_done_at = COALESCE(NEW.resolved_at, now()),
           last_done_km = COALESCE((SELECT v.current_km FROM public.cv_vehicles v WHERE v.id = NEW.vehicle_id), p.last_done_km)
     WHERE p.id = NEW.maintenance_plan_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cv_defects_reset_maintenance_plan
AFTER UPDATE ON public.cv_defect_reports
FOR EACH ROW EXECUTE FUNCTION public.cv_reset_maintenance_plan_on_resolve();