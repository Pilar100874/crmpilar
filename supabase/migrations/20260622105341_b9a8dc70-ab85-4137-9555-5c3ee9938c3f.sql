
-- ============ BANCO DE HORAS ============
CREATE TABLE public.ponto_banco_horas_saldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  saldo_minutos integer NOT NULL DEFAULT 0,
  prazo_compensacao_dias integer NOT NULL DEFAULT 180,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_expiracao date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_banco_horas_saldos TO authenticated;
GRANT ALL ON public.ponto_banco_horas_saldos TO service_role;
ALTER TABLE public.ponto_banco_horas_saldos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bh_saldos_estab" ON public.ponto_banco_horas_saldos FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

CREATE TABLE public.ponto_banco_horas_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saldo_id uuid NOT NULL REFERENCES public.ponto_banco_horas_saldos(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL,
  estabelecimento_id uuid NOT NULL,
  data date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('credito','debito','compensacao','expiracao','pagamento')),
  minutos integer NOT NULL,
  origem text,
  espelho_id uuid,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_banco_horas_lancamentos TO authenticated;
GRANT ALL ON public.ponto_banco_horas_lancamentos TO service_role;
ALTER TABLE public.ponto_banco_horas_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bh_lanc_estab" ON public.ponto_banco_horas_lancamentos FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- ============ FÉRIAS E AFASTAMENTOS ============
CREATE TABLE public.ponto_ferias_afastamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('ferias','afastamento_inss','licenca_maternidade','licenca_paternidade','licenca_remunerada','licenca_nao_remunerada','suspensao_contrato','outro')),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias integer GENERATED ALWAYS AS ((data_fim - data_inicio) + 1) STORED,
  motivo text,
  documento_url text,
  bloqueia_marcacao boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'aprovado' CHECK (status IN ('pendente','aprovado','rejeitado','cancelado')),
  esocial_evento text,
  esocial_enviado_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_ferias_afastamentos TO authenticated;
GRANT ALL ON public.ponto_ferias_afastamentos TO service_role;
ALTER TABLE public.ponto_ferias_afastamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ferias_estab" ON public.ponto_ferias_afastamentos FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- ============ NOTIFICAÇÕES DO PONTO ============
CREATE TABLE public.ponto_notificacoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL UNIQUE,
  notif_atraso boolean NOT NULL DEFAULT true,
  notif_falta boolean NOT NULL DEFAULT true,
  notif_he_pendente boolean NOT NULL DEFAULT true,
  notif_atestado_pendente boolean NOT NULL DEFAULT true,
  notif_banco_horas_expirar boolean NOT NULL DEFAULT true,
  dias_aviso_expiracao integer NOT NULL DEFAULT 15,
  canais jsonb NOT NULL DEFAULT '["email","push"]'::jsonb,
  destinatarios_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_notificacoes_config TO authenticated;
GRANT ALL ON public.ponto_notificacoes_config TO service_role;
ALTER TABLE public.ponto_notificacoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_cfg_estab" ON public.ponto_notificacoes_config FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- ============ eSOCIAL EVENTOS ============
CREATE TABLE public.ponto_esocial_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  funcionario_id uuid REFERENCES public.ponto_funcionarios(id) ON DELETE SET NULL,
  evento text NOT NULL,
  referencia_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  xml text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','aceito','rejeitado','erro')),
  protocolo text,
  recibo text,
  resposta jsonb,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_esocial_eventos TO authenticated;
GRANT ALL ON public.ponto_esocial_eventos TO service_role;
ALTER TABLE public.ponto_esocial_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esocial_estab" ON public.ponto_esocial_eventos FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- ============ ASSINATURA DIGITAL DO ESPELHO ============
ALTER TABLE public.ponto_assinaturas_espelho
  ADD COLUMN IF NOT EXISTS assinatura_digital_base64 text,
  ADD COLUMN IF NOT EXISTS certificado_serial text,
  ADD COLUMN IF NOT EXISTS certificado_titular text,
  ADD COLUMN IF NOT EXISTS algoritmo text DEFAULT 'SHA256withRSA',
  ADD COLUMN IF NOT EXISTS hash_documento text;

-- ============ MULTI-VÍNCULO (funcionário em N empresas) ============
CREATE TABLE public.ponto_funcionario_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  ponto_empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL,
  matricula text,
  cargo text,
  data_admissao date,
  data_demissao date,
  principal boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  estabelecimento_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funcionario_id, ponto_empresa_id, filial_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_vinculos TO authenticated;
GRANT ALL ON public.ponto_funcionario_vinculos TO service_role;
ALTER TABLE public.ponto_funcionario_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vinc_estab" ON public.ponto_funcionario_vinculos FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- ============ IMPORTAÇÃO EM LOTE ============
CREATE TABLE public.ponto_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('funcionarios','escalas','feriados','marcacoes')),
  arquivo_nome text,
  total_linhas integer DEFAULT 0,
  total_sucesso integer DEFAULT 0,
  total_erro integer DEFAULT 0,
  erros jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','concluido','falhou')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_importacoes TO authenticated;
GRANT ALL ON public.ponto_importacoes TO service_role;
ALTER TABLE public.ponto_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imp_estab" ON public.ponto_importacoes FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));

-- Triggers updated_at
CREATE TRIGGER set_bh_saldos_uat BEFORE UPDATE ON public.ponto_banco_horas_saldos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_ferias_uat BEFORE UPDATE ON public.ponto_ferias_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_notif_uat BEFORE UPDATE ON public.ponto_notificacoes_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_esocial_uat BEFORE UPDATE ON public.ponto_esocial_eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_vinc_uat BEFORE UPDATE ON public.ponto_funcionario_vinculos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_imp_uat BEFORE UPDATE ON public.ponto_importacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_bh_saldos_func ON public.ponto_banco_horas_saldos(funcionario_id);
CREATE INDEX idx_bh_lanc_saldo ON public.ponto_banco_horas_lancamentos(saldo_id, data);
CREATE INDEX idx_ferias_func ON public.ponto_ferias_afastamentos(funcionario_id, data_inicio, data_fim);
CREATE INDEX idx_esocial_status ON public.ponto_esocial_eventos(status, estabelecimento_id);
CREATE INDEX idx_vinc_func ON public.ponto_funcionario_vinculos(funcionario_id);
