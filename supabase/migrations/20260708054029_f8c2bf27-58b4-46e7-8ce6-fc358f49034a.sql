CREATE TABLE public.doc_assinaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  content_html TEXT NOT NULL DEFAULT '',
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_assinaturas TO authenticated;
GRANT ALL ON public.doc_assinaturas TO service_role;
ALTER TABLE public.doc_assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_assinaturas estab" ON public.doc_assinaturas FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX doc_assinaturas_estab_idx ON public.doc_assinaturas(estabelecimento_id);
CREATE TRIGGER doc_assinaturas_updated_at BEFORE UPDATE ON public.doc_assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();