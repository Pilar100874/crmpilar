
-- Grupos/setores de câmeras (expedição, portaria, produção, etc.)
CREATE TABLE public.cameras_grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  setor TEXT,
  descricao TEXT,
  cor TEXT DEFAULT '#f97316',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cameras_grupos TO authenticated;
GRANT ALL ON public.cameras_grupos TO service_role;

ALTER TABLE public.cameras_grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam grupos de câmeras"
  ON public.cameras_grupos FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_cameras_grupos_updated
  BEFORE UPDATE ON public.cameras_grupos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincula câmeras existentes a um grupo (opcional para retro-compatibilidade com CV)
ALTER TABLE public.cv_cameras
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.cameras_grupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cv_cameras_grupo ON public.cv_cameras(grupo_id);
