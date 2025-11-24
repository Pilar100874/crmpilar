-- Tabela de análise de sentimento
CREATE TABLE IF NOT EXISTS public.sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  sentiment VARCHAR(50) NOT NULL, -- 'positivo', 'neutro', 'negativo'
  score DECIMAL(5,4) NOT NULL, -- 0.0000 a 1.0000
  emotion VARCHAR(50), -- 'feliz', 'triste', 'irritado', 'frustrado', 'satisfeito'
  confidence DECIMAL(5,4) NOT NULL, -- Confiança da análise (0.0000 a 1.0000)
  keywords JSONB, -- Palavras-chave detectadas
  analysis_metadata JSONB, -- Dados adicionais da análise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de análise agregada por conversa
CREATE TABLE IF NOT EXISTS public.sentiment_conversation_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sentiment_geral VARCHAR(50) NOT NULL, -- Sentimento predominante
  score_medio DECIMAL(5,4) NOT NULL,
  total_mensagens_analisadas INTEGER NOT NULL,
  mensagens_positivas INTEGER DEFAULT 0,
  mensagens_neutras INTEGER DEFAULT 0,
  mensagens_negativas INTEGER DEFAULT 0,
  emocoes_predominantes JSONB, -- Array de emoções mais comuns
  pontos_escalacao JSONB, -- Momentos críticos da conversa
  requer_atencao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id)
);

-- Tabela de configuração de análise de sentimento
CREATE TABLE IF NOT EXISTS public.sentiment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  threshold_negativo DECIMAL(5,4) DEFAULT 0.3000, -- Score abaixo disso = negativo
  threshold_positivo DECIMAL(5,4) DEFAULT 0.7000, -- Score acima disso = positivo
  alerta_sentimento_negativo BOOLEAN DEFAULT true,
  alerta_threshold INTEGER DEFAULT 2, -- Alertar após N mensagens negativas seguidas
  canais_ativos TEXT[] DEFAULT ARRAY['whatsapp', 'webchat'], -- Canais monitorados
  escalar_automaticamente BOOLEAN DEFAULT false,
  fila_escalacao_id UUID REFERENCES public.filas_atendimento(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estabelecimento_id)
);

-- Tabela de alertas de sentimento
CREATE TABLE IF NOT EXISTS public.sentiment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  atendente_id UUID NOT NULL REFERENCES public.atendentes(id) ON DELETE CASCADE,
  tipo_alerta VARCHAR(50) NOT NULL, -- 'sentimento_negativo', 'escalacao_necessaria', 'frustracao_alta'
  descricao TEXT NOT NULL,
  score_sentimento DECIMAL(5,4),
  resolvido BOOLEAN DEFAULT false,
  resolvido_por UUID REFERENCES public.usuarios(id),
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_estabelecimento ON public.sentiment_analysis(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_chat ON public.sentiment_analysis(chat_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_message ON public.sentiment_analysis(message_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment ON public.sentiment_analysis(sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_created_at ON public.sentiment_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_sentiment_summary_estabelecimento ON public.sentiment_conversation_summary(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_summary_chat ON public.sentiment_conversation_summary(chat_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_summary_requer_atencao ON public.sentiment_conversation_summary(requer_atencao);

CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_estabelecimento ON public.sentiment_alerts(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_chat ON public.sentiment_alerts(chat_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_alerts_resolvido ON public.sentiment_alerts(resolvido);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_sentiment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_sentiment_summary_updated_at
  BEFORE UPDATE ON public.sentiment_conversation_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_sentiment_updated_at();

CREATE TRIGGER trigger_sentiment_config_updated_at
  BEFORE UPDATE ON public.sentiment_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sentiment_updated_at();

-- RLS Policies para sentiment_analysis
ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver análises do seu estabelecimento"
  ON public.sentiment_analysis FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode criar análises"
  ON public.sentiment_analysis FOR INSERT
  WITH CHECK (true);

-- RLS Policies para sentiment_conversation_summary
ALTER TABLE public.sentiment_conversation_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver resumos do seu estabelecimento"
  ON public.sentiment_conversation_summary FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode gerenciar resumos"
  ON public.sentiment_conversation_summary FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies para sentiment_config
ALTER TABLE public.sentiment_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver config do seu estabelecimento"
  ON public.sentiment_config FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem gerenciar config"
  ON public.sentiment_config FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- RLS Policies para sentiment_alerts
ALTER TABLE public.sentiment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver alertas do seu estabelecimento"
  ON public.sentiment_alerts FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode criar alertas"
  ON public.sentiment_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Supervisores podem atualizar alertas"
  ON public.sentiment_alerts FOR UPDATE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Enable Realtime para alertas de sentimento
ALTER PUBLICATION supabase_realtime ADD TABLE public.sentiment_alerts;