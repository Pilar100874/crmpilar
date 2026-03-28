
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  gateway_id TEXT NOT NULL,
  gateway_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  api_key TEXT,
  api_secret TEXT,
  webhook_secret TEXT,
  sandbox_mode BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, gateway_id)
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment gateways of their establishment"
  ON public.payment_gateways FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert payment gateways for their establishment"
  ON public.payment_gateways FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update payment gateways of their establishment"
  ON public.payment_gateways FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete payment gateways of their establishment"
  ON public.payment_gateways FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
