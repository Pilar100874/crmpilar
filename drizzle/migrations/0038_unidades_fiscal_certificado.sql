ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS certificado_path text,
  ADD COLUMN IF NOT EXISTS certificado_nome_arquivo text,
  ADD COLUMN IF NOT EXISTS certificado_titular text,
  ADD COLUMN IF NOT EXISTS certificado_valido_ate timestamptz,
  ADD COLUMN IF NOT EXISTS certificado_enviado_em timestamptz;

CREATE TABLE public.unidade_certificado_senhas (
  unidade_id uuid PRIMARY KEY REFERENCES public.unidades(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  senha text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE, DELETE ON public.unidade_certificado_senhas TO authenticated;
GRANT ALL ON public.unidade_certificado_senhas TO service_role;
ALTER TABLE public.unidade_certificado_senhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internos gravam senha do certificado" ON public.unidade_certificado_senhas
FOR INSERT TO authenticated
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos atualizam senha do certificado" ON public.unidade_certificado_senhas
FOR UPDATE TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos removem senha do certificado" ON public.unidade_certificado_senhas
FOR DELETE TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Internos gerenciam certificados da empresa" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'certificados-digitais' AND public.is_usuario_interno(auth.uid()) AND (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
WITH CHECK (bucket_id = 'certificados-digitais' AND public.is_usuario_interno(auth.uid()) AND (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text);