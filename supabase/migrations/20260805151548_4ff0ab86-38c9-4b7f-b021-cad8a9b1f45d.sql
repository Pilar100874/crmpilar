ALTER TABLE public.cv_defect_reports ADD COLUMN vehicle_km numeric DEFAULT NULL;

COMMENT ON COLUMN public.cv_defect_reports.vehicle_km IS 'Quilometragem do veículo no momento da abertura da manutenção/defeito';

GRANT ALL ON public.cv_defect_reports TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.cv_defect_reports TO authenticated;