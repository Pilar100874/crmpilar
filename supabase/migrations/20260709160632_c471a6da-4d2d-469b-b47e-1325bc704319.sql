
CREATE TABLE public.doc_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  fonte TEXT NOT NULL DEFAULT 'manual',
  opcoes TEXT[] NOT NULL DEFAULT '{}',
  tabela TEXT,
  coluna TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_form_fields TO authenticated;
GRANT ALL ON public.doc_form_fields TO service_role;
ALTER TABLE public.doc_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_form_fields estab" ON public.doc_form_fields FOR ALL
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());
CREATE TRIGGER doc_form_fields_updated_at BEFORE UPDATE ON public.doc_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_doc_form_fields_estab ON public.doc_form_fields(estabelecimento_id);
