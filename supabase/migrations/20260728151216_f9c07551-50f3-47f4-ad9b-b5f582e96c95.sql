-- 1) Coluna opcional no veículo
ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS tracker_expect_sms_reply boolean NOT NULL DEFAULT false;

-- 2) Tabela de respostas SMS do rastreador
CREATE TABLE IF NOT EXISTS public.tracker_sms_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.sms_devices(id) ON DELETE SET NULL,
  telefone_remetente text NOT NULL,
  mensagem text NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  matched_log_provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracker_sms_replies_veic ON public.tracker_sms_replies(veiculo_id, recebido_em DESC);
CREATE INDEX IF NOT EXISTS idx_tracker_sms_replies_estab ON public.tracker_sms_replies(estabelecimento_id, recebido_em DESC);
CREATE INDEX IF NOT EXISTS idx_tracker_sms_replies_phone ON public.tracker_sms_replies(telefone_remetente);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_sms_replies TO authenticated;
GRANT ALL ON public.tracker_sms_replies TO service_role;

ALTER TABLE public.tracker_sms_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios do estabelecimento gerenciam suas respostas SMS de rastreador"
  ON public.tracker_sms_replies
  FOR ALL
  TO authenticated
  USING (
    estabelecimento_id IS NULL
    OR estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
  WITH CHECK (
    estabelecimento_id IS NULL
    OR estabelecimento_id = public.get_auth_user_estabelecimento_id()
  );