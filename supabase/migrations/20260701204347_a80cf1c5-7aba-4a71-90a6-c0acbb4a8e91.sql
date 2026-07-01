
-- Configuração de vistoria (ângulos de fotos obrigatórios)
CREATE TABLE public.cv_inspection_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'default',
  exit_photos JSONB NOT NULL DEFAULT '[
    {"key":"front","label":"Frente","required":true},
    {"key":"rear","label":"Traseira","required":true},
    {"key":"right","label":"Lado Direito","required":true},
    {"key":"left","label":"Lado Esquerdo","required":true}
  ]'::jsonb,
  entry_photos JSONB NOT NULL DEFAULT '[
    {"key":"front","label":"Frente","required":true},
    {"key":"rear","label":"Traseira","required":true},
    {"key":"right","label":"Lado Direito","required":true},
    {"key":"left","label":"Lado Esquerdo","required":true}
  ]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_inspection_config TO authenticated;
GRANT ALL ON public.cv_inspection_config TO service_role;
ALTER TABLE public.cv_inspection_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_inspection_config_all_auth" ON public.cv_inspection_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.cv_inspection_config (name) VALUES ('default');

-- Fotos das vistorias vinculadas às movimentações
CREATE TABLE public.cv_movement_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_id UUID NOT NULL REFERENCES public.cv_vehicle_movements(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('exit','entry')),
  angle_key TEXT NOT NULL,
  angle_label TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cv_movement_photos_movement_idx ON public.cv_movement_photos(movement_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_movement_photos TO authenticated;
GRANT ALL ON public.cv_movement_photos TO service_role;
ALTER TABLE public.cv_movement_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_movement_photos_all_auth" ON public.cv_movement_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);
