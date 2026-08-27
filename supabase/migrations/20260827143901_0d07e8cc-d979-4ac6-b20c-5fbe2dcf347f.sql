CREATE TABLE public.transp_inspection_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  active boolean NOT NULL DEFAULT true,
  entry_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  exit_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  entry_photos_required boolean NOT NULL DEFAULT true,
  exit_photos_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_inspection_config TO authenticated;
GRANT ALL ON public.transp_inspection_config TO service_role;

ALTER TABLE public.transp_inspection_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados gerenciam config de vistoria transp"
ON public.transp_inspection_config FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER transp_inspection_config_updated_at
BEFORE UPDATE ON public.transp_inspection_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();