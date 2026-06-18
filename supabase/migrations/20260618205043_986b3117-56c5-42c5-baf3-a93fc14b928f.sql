
CREATE TABLE public.produto_imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  is_principal BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_produto_imagens_produto ON public.produto_imagens(produto_id);
CREATE INDEX idx_produto_imagens_estab ON public.produto_imagens(estabelecimento_id);
CREATE UNIQUE INDEX uq_produto_imagens_principal ON public.produto_imagens(produto_id) WHERE is_principal = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_imagens TO authenticated;
GRANT ALL ON public.produto_imagens TO service_role;

ALTER TABLE public.produto_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View produto_imagens (same estab or admin)" ON public.produto_imagens
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage produto_imagens (admin/gestor or admin)" ON public.produto_imagens
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid())
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid())
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE TRIGGER trg_produto_imagens_updated_at
  BEFORE UPDATE ON public.produto_imagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
