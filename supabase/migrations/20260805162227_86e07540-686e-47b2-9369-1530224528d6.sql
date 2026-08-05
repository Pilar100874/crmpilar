CREATE TABLE public.cv_maintenance_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  codigo text,
  tipo_veiculo text NOT NULL,
  sistema text NOT NULL,
  componente text NOT NULL,
  acao text NOT NULL,
  interval_principal integer,
  interval_days integer,
  regra text NOT NULL DEFAULT 'km ou dias',
  tol_principal integer NOT NULL DEFAULT 0,
  tol_days integer NOT NULL DEFAULT 0,
  criticidade text NOT NULL DEFAULT 'Média',
  fabricante text,
  observacoes text,
  no_roteiro boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_maintenance_catalog TO authenticated;
GRANT ALL ON public.cv_maintenance_catalog TO service_role;

ALTER TABLE public.cv_maintenance_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_maintenance_catalog_tenant" ON public.cv_maintenance_catalog
  FOR ALL TO authenticated
  USING (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
  WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()));

CREATE INDEX idx_cv_maint_catalog_tipo ON public.cv_maintenance_catalog(tipo_veiculo);

CREATE TRIGGER cv_maintenance_catalog_updated_at
BEFORE UPDATE ON public.cv_maintenance_catalog
FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

ALTER TABLE public.cv_vehicles ADD COLUMN IF NOT EXISTS fleet_type text;

ALTER TABLE public.cv_maintenance_plans
  ADD COLUMN IF NOT EXISTS catalog_item_id uuid REFERENCES public.cv_maintenance_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual';

CREATE TABLE public.cv_maintenance_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  defect_report_id uuid NOT NULL REFERENCES public.cv_defect_reports(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.cv_maintenance_plans(id) ON DELETE SET NULL,
  catalog_item_id uuid REFERENCES public.cv_maintenance_catalog(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  criticidade text,
  feito boolean,
  observacao text,
  done_at timestamptz,
  done_by text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_maintenance_checklist TO authenticated;
GRANT ALL ON public.cv_maintenance_checklist TO service_role;

ALTER TABLE public.cv_maintenance_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_maintenance_checklist_tenant" ON public.cv_maintenance_checklist
  FOR ALL TO authenticated
  USING (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
  WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()));

CREATE INDEX idx_cv_maint_checklist_report ON public.cv_maintenance_checklist(defect_report_id);

CREATE TRIGGER cv_maintenance_checklist_updated_at
BEFORE UPDATE ON public.cv_maintenance_checklist
FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

CREATE OR REPLACE FUNCTION public.cv_checklist_apply_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_km integer;
BEGIN
  IF NEW.feito IS TRUE AND NEW.plan_id IS NOT NULL
     AND (OLD.feito IS DISTINCT FROM NEW.feito) THEN
    SELECT v.current_km INTO v_km
      FROM public.cv_defect_reports d
      JOIN public.cv_vehicles v ON v.id = d.vehicle_id
     WHERE d.id = NEW.defect_report_id;
    UPDATE public.cv_maintenance_plans p
       SET last_done_at = COALESCE(NEW.done_at, now()),
           last_done_km = COALESCE(v_km, p.last_done_km)
     WHERE p.id = NEW.plan_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cv_checklist_apply_done_trg
AFTER UPDATE ON public.cv_maintenance_checklist
FOR EACH ROW EXECUTE FUNCTION public.cv_checklist_apply_done();