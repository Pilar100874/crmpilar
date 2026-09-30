CREATE TABLE public.anotacoes_ligacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anotacoes_ligacao TO authenticated;
GRANT ALL ON public.anotacoes_ligacao TO service_role;
ALTER TABLE public.anotacoes_ligacao ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.anotacoes_ligacao (customer_id, created_at DESC);
CREATE POLICY "Usuário gerencia suas anotações de ligação" ON public.anotacoes_ligacao
FOR ALL TO authenticated
USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));