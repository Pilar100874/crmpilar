CREATE TABLE public.app_update_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  device_id uuid NOT NULL REFERENCES public.sms_devices(id) ON DELETE CASCADE,
  release_id uuid NOT NULL REFERENCES public.app_releases(id) ON DELETE RESTRICT,
  app text NOT NULL,
  versao_alvo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'instalando', 'concluido', 'erro', 'cancelado')),
  resultado jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  recebido_em timestamptz,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_update_commands TO authenticated;
GRANT ALL ON public.app_update_commands TO service_role;

ALTER TABLE public.app_update_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_update_commands_tenant_all ON public.app_update_commands
  FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE INDEX idx_app_update_commands_device_status
  ON public.app_update_commands(device_id, status, created_at);
CREATE INDEX idx_app_update_commands_tenant_created
  ON public.app_update_commands(estabelecimento_id, created_at DESC);

CREATE TRIGGER trg_app_update_commands_updated_at
  BEFORE UPDATE ON public.app_update_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();