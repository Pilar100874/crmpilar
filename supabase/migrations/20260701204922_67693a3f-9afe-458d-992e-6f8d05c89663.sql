
CREATE TABLE public.cv_helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  document TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_helpers TO authenticated;
GRANT ALL ON public.cv_helpers TO service_role;
ALTER TABLE public.cv_helpers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage helpers" ON public.cv_helpers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_cv_helpers_updated_at BEFORE UPDATE ON public.cv_helpers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cv_vehicle_movements ADD COLUMN IF NOT EXISTS helper_id UUID REFERENCES public.cv_helpers(id);

ALTER TABLE public.cv_inspection_config
  ADD COLUMN IF NOT EXISTS exit_photos_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS entry_photos_required BOOLEAN NOT NULL DEFAULT true;
