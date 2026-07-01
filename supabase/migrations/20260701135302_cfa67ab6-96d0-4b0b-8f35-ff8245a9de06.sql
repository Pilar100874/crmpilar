ALTER TABLE public.ponto_empresas
  ADD COLUMN IF NOT EXISTS geofence_obrigatorio_app boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.ponto_empresas.geofence_obrigatorio_app IS
  'Quando true, marcações via app/web só são aceitas dentro de uma das geofences ativas da empresa.';