CREATE TABLE public.potenciais_config (
  estabelecimento_id uuid PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.potenciais_config TO authenticated;
GRANT ALL ON public.potenciais_config TO service_role;
ALTER TABLE public.potenciais_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "potenciais_config da empresa" ON public.potenciais_config FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TABLE public.potenciais_dispensas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  usuario_id uuid,
  motivo text NOT NULL,
  ate date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX potenciais_dispensas_estab_idx ON public.potenciais_dispensas (estabelecimento_id, ate);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.potenciais_dispensas TO authenticated;
GRANT ALL ON public.potenciais_dispensas TO service_role;
ALTER TABLE public.potenciais_dispensas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "potenciais_dispensas da empresa" ON public.potenciais_dispensas FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());