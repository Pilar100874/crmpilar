CREATE TABLE public.notas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  entidade_tipo TEXT,
  entidade_id UUID,
  favorito BOOLEAN NOT NULL DEFAULT false,
  autor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_estab ON public.notas (estabelecimento_id);
CREATE INDEX idx_notas_entidade ON public.notas (entidade_tipo, entidade_id);
CREATE INDEX idx_notas_titulo ON public.notas (lower(titulo));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas TO authenticated;
GRANT ALL ON public.notas TO service_role;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_estab_all" ON public.notas FOR ALL TO authenticated
USING (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TABLE public.nota_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origem_id UUID NOT NULL REFERENCES public.notas(id) ON DELETE CASCADE,
  destino_titulo TEXT NOT NULL,
  destino_id UUID REFERENCES public.notas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (origem_id, destino_titulo)
);

CREATE INDEX idx_nota_links_destino ON public.nota_links (destino_id);
CREATE INDEX idx_nota_links_destino_titulo ON public.nota_links (lower(destino_titulo));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nota_links TO authenticated;
GRANT ALL ON public.nota_links TO service_role;
ALTER TABLE public.nota_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nota_links_estab_all" ON public.nota_links FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.notas n WHERE n.id = nota_links.origem_id
  AND (n.estabelecimento_id IS NULL OR n.estabelecimento_id = public.get_auth_user_estabelecimento_id())))
WITH CHECK (EXISTS (SELECT 1 FROM public.notas n WHERE n.id = nota_links.origem_id
  AND (n.estabelecimento_id IS NULL OR n.estabelecimento_id = public.get_auth_user_estabelecimento_id())));

CREATE OR REPLACE FUNCTION public.notas_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_notas_updated_at BEFORE UPDATE ON public.notas
FOR EACH ROW EXECUTE FUNCTION public.notas_touch_updated_at();