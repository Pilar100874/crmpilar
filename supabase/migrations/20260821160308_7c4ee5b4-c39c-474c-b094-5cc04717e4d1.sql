ALTER TABLE public.cv_vehicles ADD COLUMN IF NOT EXISTS logistica_grupo_id uuid REFERENCES public.logistica_grupos(id) ON DELETE SET NULL;
ALTER TABLE public.cv_drivers ADD COLUMN IF NOT EXISTS logistica_grupo_id uuid REFERENCES public.logistica_grupos(id) ON DELETE SET NULL;

UPDATE public.cv_vehicles cv
SET logistica_grupo_id = v.grupo_id
FROM public.veiculos v
WHERE cv.veiculo_id = v.id AND cv.logistica_grupo_id IS NULL AND v.grupo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cv_vehicles_logistica_grupo ON public.cv_vehicles(logistica_grupo_id);
CREATE INDEX IF NOT EXISTS idx_cv_drivers_logistica_grupo ON public.cv_drivers(logistica_grupo_id);