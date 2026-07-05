
-- Estende ponto_notificacoes_config para SMS/WhatsApp + fraude + canal por evento
ALTER TABLE public.ponto_notificacoes_config
  ADD COLUMN IF NOT EXISTS sms_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notificar_funcionario boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_fraude boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS destinatarios_telefones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canais_por_evento jsonb NOT NULL DEFAULT '{
    "atraso":            ["push"],
    "falta":             ["push","email"],
    "he_pendente":       ["push","email"],
    "atestado_pendente": ["push"],
    "bh_expirar":        ["push","email"],
    "fraude":            ["push","email","whatsapp"]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS mensagens_template jsonb NOT NULL DEFAULT '{
    "atraso":            "⏰ Atraso registrado em {data} para {funcionario}.",
    "falta":             "🚨 Falta registrada em {data} para {funcionario}.",
    "he_pendente":       "⌛ Você tem {quantidade} hora(s) extra pendente(s) de aprovação.",
    "atestado_pendente": "📄 Existem {quantidade} atestado(s) pendente(s) de validação.",
    "bh_expirar":        "🕐 Banco de horas próximo do vencimento em {data_expiracao}.",
    "fraude":            "🛑 Alerta de possível fraude: {detalhe} ({funcionario} em {data})."
  }'::jsonb;
