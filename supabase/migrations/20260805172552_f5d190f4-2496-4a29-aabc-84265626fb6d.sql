ALTER TABLE public.cv_defect_reports
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'preventiva',
  ADD COLUMN IF NOT EXISTS agrupavel boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pecas text,
  ADD COLUMN IF NOT EXISTS km_baixa integer,
  ADD COLUMN IF NOT EXISTS data_baixa timestamptz;

ALTER TABLE public.cv_maintenance_catalog
  ADD COLUMN IF NOT EXISTS pecas text;

ALTER TABLE public.cv_maintenance_plans
  ADD COLUMN IF NOT EXISTS pecas text;

ALTER TABLE public.cv_maintenance_checklist
  ADD COLUMN IF NOT EXISTS pecas text;

CREATE INDEX IF NOT EXISTS idx_cv_defect_reports_prioridade
  ON public.cv_defect_reports (vehicle_id, status, prioridade);