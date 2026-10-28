CREATE TABLE public.cv_checklist_saida_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid DEFAULT public.get_auth_user_estabelecimento_id(),
  responsavel text NOT NULL DEFAULT 'motorista',
  categoria text NOT NULL DEFAULT 'Geral',
  item text NOT NULL,
  tipos_veiculo text[] NOT NULL DEFAULT '{}',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_checklist_saida_itens TO authenticated;
GRANT ALL ON public.cv_checklist_saida_itens TO service_role;
ALTER TABLE public.cv_checklist_saida_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY cv_checklist_saida_tenant ON public.cv_checklist_saida_itens FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()))
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid()));