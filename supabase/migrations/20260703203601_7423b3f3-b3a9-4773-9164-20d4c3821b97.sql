-- 1) Table for GPS tracker device models (editable per establishment)
CREATE TABLE IF NOT EXISTS public.tracker_device_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  protocolo TEXT NOT NULL,
  porta INTEGER NOT NULL DEFAULT 5023,
  host TEXT,
  senha_padrao TEXT DEFAULT '123456',
  apn TEXT DEFAULT 'zap.vivo.com.br',
  apn_user TEXT DEFAULT '',
  apn_password TEXT DEFAULT '',
  descricao TEXT,
  supports_bloqueio BOOLEAN NOT NULL DEFAULT false,
  sms_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_device_models TO authenticated;
GRANT ALL ON public.tracker_device_models TO service_role;

ALTER TABLE public.tracker_device_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users of establishment can read tracker models"
  ON public.tracker_device_models FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users can insert tracker models"
  ON public.tracker_device_models FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Users can update tracker models"
  ON public.tracker_device_models FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Users can delete tracker models"
  ON public.tracker_device_models FOR DELETE TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tracker_models_estab
  ON public.tracker_device_models(estabelecimento_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tracker_models_updated_at ON public.tracker_device_models;
CREATE TRIGGER trg_tracker_models_updated_at
  BEFORE UPDATE ON public.tracker_device_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Vehicle tracker configuration status columns
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS tracker_model_id UUID REFERENCES public.tracker_device_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracker_config_status TEXT NOT NULL DEFAULT 'nao_configurado',
  ADD COLUMN IF NOT EXISTS tracker_config_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracker_config_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tracker_config_error TEXT;
