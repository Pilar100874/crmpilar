
-- 1) Log de envios
CREATE TABLE IF NOT EXISTS public.ponto_notificacoes_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  tipo text NOT NULL,
  canal text NOT NULL,             -- push|email|sms|whatsapp|webhook
  destinatario text,               -- telefone ou email
  funcionario_id uuid,
  titulo text,
  mensagem text,
  status text NOT NULL,            -- enviado|falha|bloqueado_quiet|bloqueado_ratelimit|deduplicado|confirmado
  erro text,
  custo_estimado numeric,
  dedupe_hash text,
  confirmado_em timestamptz,
  confirmado_via text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pne_estab_data ON public.ponto_notificacoes_envios(estabelecimento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pne_dedupe ON public.ponto_notificacoes_envios(dedupe_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pne_func ON public.ponto_notificacoes_envios(funcionario_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.ponto_notificacoes_envios TO authenticated;
GRANT ALL ON public.ponto_notificacoes_envios TO service_role;
ALTER TABLE public.ponto_notificacoes_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "envios do mesmo estabelecimento" ON public.ponto_notificacoes_envios
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "insert do mesmo estab" ON public.ponto_notificacoes_envios
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- 2) Preferências por funcionário
CREATE TABLE IF NOT EXISTS public.ponto_funcionario_notif_prefs (
  funcionario_id uuid PRIMARY KEY,
  estabelecimento_id uuid NOT NULL,
  canais_preferidos text[] NOT NULL DEFAULT ARRAY['push','whatsapp']::text[],
  aceita_push boolean NOT NULL DEFAULT true,
  aceita_sms boolean NOT NULL DEFAULT true,
  aceita_whatsapp boolean NOT NULL DEFAULT true,
  aceita_email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_notif_prefs TO authenticated;
GRANT ALL ON public.ponto_funcionario_notif_prefs TO service_role;
ALTER TABLE public.ponto_funcionario_notif_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prefs do mesmo estab" ON public.ponto_funcionario_notif_prefs
  FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- 3) Extensões em ponto_notificacoes_config
ALTER TABLE public.ponto_notificacoes_config
  ADD COLUMN IF NOT EXISTS quiet_hours_inicio time DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_fim time DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS enviar_fins_de_semana boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bypass_quiet_hours_tipos jsonb NOT NULL DEFAULT '["fraude"]'::jsonb,
  ADD COLUMN IF NOT EXISTS dedupe_janela_horas int NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS rate_limit_por_hora int NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS escalonamento_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalonamento_horas int NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS escalonamento_telefones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalonamento_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resumo_diario_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resumo_diario_hora time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS resumo_canal text DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS whatsapp_permite_confirmacao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mensagens_template_lider jsonb NOT NULL DEFAULT '{
    "atraso":            "⏰ {funcionario} registrou atraso em {data}.",
    "falta":             "🚨 Falta de {funcionario} em {data}. Ver: {link_aprovacao}",
    "he_pendente":       "⌛ {funcionario} tem {quantidade} HE pendente(s) para sua aprovação: {link_aprovacao}",
    "atestado_pendente": "📄 {quantidade} atestado(s) aguardando validação: {link_aprovacao}",
    "bh_expirar":        "🕐 Banco de horas de {funcionario} vence em {data_expiracao} (saldo {saldo_bh}).",
    "fraude":            "🛑 Fraude suspeita: {detalhe} — {funcionario} em {data}. Verificar: {link_aprovacao}"
  }'::jsonb;
