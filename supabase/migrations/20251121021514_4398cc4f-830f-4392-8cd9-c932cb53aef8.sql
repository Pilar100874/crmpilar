-- Tabela de configurações de notificações por usuário
CREATE TABLE IF NOT EXISTS notificacoes_usuario_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  novo_chat_enabled BOOLEAN DEFAULT true,
  cliente_respondeu_enabled BOOLEAN DEFAULT true,
  transferencia_recebida_enabled BOOLEAN DEFAULT true,
  sla_alerta_enabled BOOLEAN DEFAULT true,
  som_enabled BOOLEAN DEFAULT true,
  volume INTEGER DEFAULT 80 CHECK (volume >= 0 AND volume <= 100),
  desktop_notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, estabelecimento_id)
);

-- Tabela de log de notificações enviadas
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  chat_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_usuario ON notificacoes_log(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_lida ON notificacoes_log(usuario_id, lida);

-- RLS Policies para notificacoes_usuario_config
ALTER TABLE notificacoes_usuario_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas configs"
  ON notificacoes_usuario_config FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuários podem criar suas configs"
  ON notificacoes_usuario_config FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas configs"
  ON notificacoes_usuario_config FOR UPDATE
  USING (usuario_id = auth.uid());

-- RLS Policies para notificacoes_log
ALTER TABLE notificacoes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas notificações"
  ON notificacoes_log FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "Sistema pode criar notificações"
  ON notificacoes_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem marcar suas notificações como lidas"
  ON notificacoes_log FOR UPDATE
  USING (usuario_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notificacoes_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notificacoes_config_updated_at
  BEFORE UPDATE ON notificacoes_usuario_config
  FOR EACH ROW
  EXECUTE FUNCTION update_notificacoes_config_updated_at();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes_log;