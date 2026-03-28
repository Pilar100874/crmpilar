
CREATE TABLE public.ecommerce_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'desconto',
  ativo BOOLEAN DEFAULT false,
  prioridade INTEGER DEFAULT 0,
  flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  expires_at TIMESTAMPTZ,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecommerce_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ecommerce rules of their establishment"
  ON public.ecommerce_rules FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert ecommerce rules for their establishment"
  ON public.ecommerce_rules FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update ecommerce rules of their establishment"
  ON public.ecommerce_rules FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete ecommerce rules of their establishment"
  ON public.ecommerce_rules FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER update_ecommerce_rules_updated_at
  BEFORE UPDATE ON public.ecommerce_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
