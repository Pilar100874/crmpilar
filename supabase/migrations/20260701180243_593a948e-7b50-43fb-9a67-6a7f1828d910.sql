-- ENUMs
DO $$ BEGIN
  CREATE TYPE public.cv_vehicle_type AS ENUM ('vuc','truck','carro','carreta','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cv_defect_category AS ENUM ('mechanical','electrical','bodywork','safety','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cv_defect_status AS ENUM ('pending','in_progress','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cv_movement_status AS ENUM ('out','returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: update updated_at
CREATE OR REPLACE FUNCTION public.cv_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========== VEHICLES ===========
CREATE TABLE public.cv_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plate TEXT NOT NULL,
  vehicle_type cv_vehicle_type NOT NULL DEFAULT 'carro',
  current_km INTEGER NOT NULL DEFAULT 0,
  oil_change_interval INTEGER NOT NULL DEFAULT 10000,
  last_oil_change_km INTEGER NOT NULL DEFAULT 0,
  next_oil_change_km INTEGER NOT NULL DEFAULT 10000,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_vehicles_estab ON public.cv_vehicles(estabelecimento_id);
CREATE UNIQUE INDEX idx_cv_vehicles_plate_estab ON public.cv_vehicles(estabelecimento_id, plate);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_vehicles TO authenticated;
GRANT ALL ON public.cv_vehicles TO service_role;
ALTER TABLE public.cv_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_vehicles_all_authenticated"
  ON public.cv_vehicles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER cv_vehicles_updated_at BEFORE UPDATE ON public.cv_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

-- =========== DRIVERS ===========
CREATE TABLE public.cv_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  license TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_drivers_estab ON public.cv_drivers(estabelecimento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_drivers TO authenticated;
GRANT ALL ON public.cv_drivers TO service_role;
ALTER TABLE public.cv_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_drivers_all_authenticated"
  ON public.cv_drivers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER cv_drivers_updated_at BEFORE UPDATE ON public.cv_drivers
  FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

-- =========== DEFECT TYPES ===========
CREATE TABLE public.cv_defect_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category cv_defect_category NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_defect_types_estab ON public.cv_defect_types(estabelecimento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_defect_types TO authenticated;
GRANT ALL ON public.cv_defect_types TO service_role;
ALTER TABLE public.cv_defect_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_defect_types_all_authenticated"
  ON public.cv_defect_types FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER cv_defect_types_updated_at BEFORE UPDATE ON public.cv_defect_types
  FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

-- =========== MOVEMENTS ===========
CREATE TABLE public.cv_vehicle_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cv_vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.cv_drivers(id) ON DELETE RESTRICT,
  security_guard_id UUID, -- usuarios.id
  has_helper BOOLEAN NOT NULL DEFAULT FALSE,
  helper_name TEXT,
  exit_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  exit_km INTEGER NOT NULL DEFAULT 0,
  exit_notes TEXT,
  entry_time TIMESTAMPTZ,
  entry_km INTEGER,
  reported_defects TEXT,
  damage_notes TEXT,
  inspected_by UUID, -- usuarios.id
  inspected_all_sides BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  status cv_movement_status NOT NULL DEFAULT 'out',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_movements_estab ON public.cv_vehicle_movements(estabelecimento_id);
CREATE INDEX idx_cv_movements_vehicle ON public.cv_vehicle_movements(vehicle_id);
CREATE INDEX idx_cv_movements_status ON public.cv_vehicle_movements(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_vehicle_movements TO authenticated;
GRANT ALL ON public.cv_vehicle_movements TO service_role;
ALTER TABLE public.cv_vehicle_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_movements_all_authenticated"
  ON public.cv_vehicle_movements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER cv_movements_updated_at BEFORE UPDATE ON public.cv_vehicle_movements
  FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();

-- =========== DEFECT REPORTS ===========
CREATE TABLE public.cv_defect_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.cv_vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.cv_drivers(id) ON DELETE SET NULL,
  movement_id UUID REFERENCES public.cv_vehicle_movements(id) ON DELETE SET NULL,
  defect_type_id UUID REFERENCES public.cv_defect_types(id) ON DELETE SET NULL,
  defect_description TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_by TEXT, -- usuarios.id ou nome livre
  status cv_defect_status NOT NULL DEFAULT 'pending',
  solution TEXT,
  cost NUMERIC(12,2),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  validated_by TEXT,
  is_damage_report BOOLEAN NOT NULL DEFAULT FALSE,
  damage_points JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cv_defects_estab ON public.cv_defect_reports(estabelecimento_id);
CREATE INDEX idx_cv_defects_vehicle ON public.cv_defect_reports(vehicle_id);
CREATE INDEX idx_cv_defects_status ON public.cv_defect_reports(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_defect_reports TO authenticated;
GRANT ALL ON public.cv_defect_reports TO service_role;
ALTER TABLE public.cv_defect_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_defects_all_authenticated"
  ON public.cv_defect_reports FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER cv_defects_updated_at BEFORE UPDATE ON public.cv_defect_reports
  FOR EACH ROW EXECUTE FUNCTION public.cv_update_updated_at();