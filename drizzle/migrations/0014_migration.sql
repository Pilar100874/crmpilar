CREATE TABLE public.recebidos_ignorados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL DEFAULT public.get_auth_user_estabelecimento_id(),
  tipo text NOT NULL,
  valor text NOT NULL,
  criado_por uuid DEFAULT public.get_current_usuario_id(),
  criado_por_nome text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, tipo, valor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebidos_ignorados TO authenticated;
GRANT ALL ON public.recebidos_ignorados TO service_role;
ALTER TABLE public.recebidos_ignorados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa gerencia remetentes ignorados" ON public.recebidos_ignorados
  FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());