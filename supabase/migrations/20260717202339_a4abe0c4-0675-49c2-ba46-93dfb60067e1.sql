
CREATE TABLE public.logistica_grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_grupos TO authenticated;
GRANT ALL ON public.logistica_grupos TO service_role;

ALTER TABLE public.logistica_grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read logistica_grupos" ON public.logistica_grupos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert logistica_grupos" ON public.logistica_grupos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update logistica_grupos" ON public.logistica_grupos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete logistica_grupos" ON public.logistica_grupos
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_logistica_grupos_updated_at
BEFORE UPDATE ON public.logistica_grupos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK-less link column on veiculos (grupo_id already exists pointing to unidades; add new column to reference the independent groups)
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS logistica_grupo_id UUID REFERENCES public.logistica_grupos(id) ON DELETE SET NULL;
