
CREATE TABLE public.mensagens_grupo_produto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  grupo_id UUID NOT NULL REFERENCES public.produto_grupos(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  frase TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mgp_grupo_tema ON public.mensagens_grupo_produto(grupo_id, tema);
CREATE INDEX idx_mgp_estab ON public.mensagens_grupo_produto(estabelecimento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_grupo_produto TO authenticated;
GRANT ALL ON public.mensagens_grupo_produto TO service_role;

ALTER TABLE public.mensagens_grupo_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth manage mensagens grupo produto"
  ON public.mensagens_grupo_produto FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_mgp_updated
  BEFORE UPDATE ON public.mensagens_grupo_produto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
