
CREATE TABLE public.ponto_atestados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  cid text,
  observacao text,
  arquivo_url text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  revisado_por uuid,
  revisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_atestados TO authenticated;
GRANT ALL ON public.ponto_atestados TO service_role;

ALTER TABLE public.ponto_atestados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Func ve seus atestados" ON public.ponto_atestados
  FOR SELECT TO authenticated
  USING (
    funcionario_id IN (
      SELECT id FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Func envia seu atestado" ON public.ponto_atestados
  FOR INSERT TO authenticated
  WITH CHECK (
    funcionario_id IN (
      SELECT id FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "RH atualiza atestados" ON public.ponto_atestados
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE TRIGGER trg_ponto_atestados_updated
  BEFORE UPDATE ON public.ponto_atestados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies: pasta = funcionario_id
CREATE POLICY "Func envia atestado no proprio dir"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ponto-atestados'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Func le proprios atestados"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ponto-atestados'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid())
    )
  );
