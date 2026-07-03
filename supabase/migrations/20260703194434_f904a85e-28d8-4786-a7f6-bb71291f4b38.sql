
-- Tabela de dispositivos (celulares) autorizados a processar SMS
CREATE TABLE public.sms_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid,
  nome text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo boolean NOT NULL DEFAULT true,
  ultimo_ping timestamptz,
  ultimo_ip text,
  bateria int,
  sinal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_devices TO authenticated;
GRANT ALL ON public.sms_devices TO service_role;
ALTER TABLE public.sms_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios do estabelecimento gerenciam seus dispositivos"
ON public.sms_devices FOR ALL TO authenticated
USING (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_sms_devices_updated_at
BEFORE UPDATE ON public.sms_devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de fila de SMS
CREATE TABLE public.sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid,
  device_id uuid REFERENCES public.sms_devices(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviando','enviado','erro')),
  tentativas int NOT NULL DEFAULT 0,
  max_tentativas int NOT NULL DEFAULT 3,
  erro_mensagem text,
  claimed_at timestamptz,
  enviado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_queue_status ON public.sms_queue(status, created_at);
CREATE INDEX idx_sms_queue_device ON public.sms_queue(device_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_queue TO authenticated;
GRANT ALL ON public.sms_queue TO service_role;
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios do estabelecimento gerenciam sua fila SMS"
ON public.sms_queue FOR ALL TO authenticated
USING (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id IS NULL OR estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_sms_queue_updated_at
BEFORE UPDATE ON public.sms_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
