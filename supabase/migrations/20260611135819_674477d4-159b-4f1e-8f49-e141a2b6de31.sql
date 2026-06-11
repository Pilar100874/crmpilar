
CREATE TABLE public.whatsapp_numeros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  provider text NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution','cloud_api')),
  ativo boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  -- Evolution
  waha_url text,
  waha_api_key text,
  session_name text,
  -- Cloud API
  cloud_phone_number_id text,
  cloud_access_token text,
  cloud_business_account_id text,
  cloud_webhook_verify_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_numeros_estab ON public.whatsapp_numeros(estabelecimento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_numeros TO authenticated;
GRANT ALL ON public.whatsapp_numeros TO service_role;

ALTER TABLE public.whatsapp_numeros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores gerenciam numeros do estabelecimento"
ON public.whatsapp_numeros
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
)
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
);

CREATE TRIGGER update_whatsapp_numeros_updated_at
BEFORE UPDATE ON public.whatsapp_numeros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bot_flows
  ADD COLUMN IF NOT EXISTS whatsapp_numero_id uuid REFERENCES public.whatsapp_numeros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bot_flows_whatsapp_numero ON public.bot_flows(whatsapp_numero_id);
