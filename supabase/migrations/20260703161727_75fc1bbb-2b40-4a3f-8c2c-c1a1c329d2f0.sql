
CREATE TABLE IF NOT EXISTS public.sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gatewayapi' CHECK (provider IN ('gatewayapi','twilio','zenvia')),
  sender TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  -- Twilio
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_from TEXT,
  -- GatewayAPI
  gatewayapi_token TEXT,
  -- Zenvia
  zenvia_api_token TEXT,
  zenvia_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_config TO authenticated;
GRANT ALL ON public.sms_config TO service_role;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage sms_config"
ON public.sms_config FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sms_envios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  provider TEXT NOT NULL,
  destino TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  erro TEXT,
  response_raw JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_envios TO authenticated;
GRANT ALL ON public.sms_envios TO service_role;
ALTER TABLE public.sms_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sms_envios"
ON public.sms_envios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert sms_envios"
ON public.sms_envios FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_envios_estab ON public.sms_envios(estabelecimento_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sms_config_touch_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_sms_config_updated ON public.sms_config;
CREATE TRIGGER trg_sms_config_updated BEFORE UPDATE ON public.sms_config
FOR EACH ROW EXECUTE FUNCTION public.sms_config_touch_updated_at();
