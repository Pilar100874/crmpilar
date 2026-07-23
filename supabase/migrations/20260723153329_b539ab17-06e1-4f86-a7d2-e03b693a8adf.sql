
DO $$ BEGIN
  CREATE TYPE public.whatsapp_status_enum AS ENUM ('unknown','valid','invalid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS whatsapp_status public.whatsapp_status_enum NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_status_reason text;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS whatsapp_status public.whatsapp_status_enum NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_status_reason text;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS whatsapp_status public.whatsapp_status_enum NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS whatsapp_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_status_reason text;

CREATE INDEX IF NOT EXISTS idx_usuarios_whatsapp_status ON public.usuarios(whatsapp_status) WHERE whatsapp_status = 'invalid';
CREATE INDEX IF NOT EXISTS idx_empresas_whatsapp_status ON public.empresas(whatsapp_status) WHERE whatsapp_status = 'invalid';
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_status ON public.customers(whatsapp_status) WHERE whatsapp_status = 'invalid';
