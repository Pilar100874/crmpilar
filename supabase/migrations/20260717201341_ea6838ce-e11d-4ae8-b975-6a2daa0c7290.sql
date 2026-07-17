ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_veiculos_grupo_id ON public.veiculos(grupo_id);