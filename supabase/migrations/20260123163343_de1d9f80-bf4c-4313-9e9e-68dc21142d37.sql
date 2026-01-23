-- Tabela de oportunidades de licitação
CREATE TABLE public.licitacoes_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'pncp',
  source_id TEXT NOT NULL,
  orgao_nome TEXT,
  orgao_cnpj TEXT,
  uf TEXT,
  municipio TEXT,
  modalidade TEXT,
  numero TEXT,
  ano INTEGER,
  objeto TEXT,
  data_publicacao TIMESTAMPTZ,
  data_abertura TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  valor_estimado NUMERIC(15,2),
  url_detalhe TEXT,
  status TEXT DEFAULT 'novo',
  keywords_matched TEXT[] DEFAULT '{}',
  score INTEGER DEFAULT 0,
  summary_ai TEXT,
  vendedor_atribuido_id UUID REFERENCES public.usuarios(id),
  descartado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id, source, source_id)
);

-- Tabela de keywords para busca
CREATE TABLE public.licitacoes_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  categoria TEXT NOT NULL,
  peso INTEGER DEFAULT 5,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de score
CREATE TABLE public.licitacoes_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  peso INTEGER DEFAULT 5,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de alertas enviados
CREATE TABLE public.licitacoes_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.licitacoes_opportunities(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'sent',
  recipients TEXT[]
);

-- Tabela de execuções do bot
CREATE TABLE public.licitacoes_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  items_found INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  error TEXT
);

-- Tabela de configurações gerais
CREATE TABLE public.licitacoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  intervalo_minutos INTEGER DEFAULT 30,
  score_minimo_alerta INTEGER DEFAULT 10,
  uf_prioridade TEXT,
  emails_notificacao TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_licitacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_licitacoes_opportunities_updated_at
  BEFORE UPDATE ON public.licitacoes_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_licitacoes_updated_at();

CREATE TRIGGER update_licitacoes_config_updated_at
  BEFORE UPDATE ON public.licitacoes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_licitacoes_updated_at();

CREATE TRIGGER update_licitacoes_score_config_updated_at
  BEFORE UPDATE ON public.licitacoes_score_config
  FOR EACH ROW EXECUTE FUNCTION public.update_licitacoes_updated_at();

-- Enable RLS
ALTER TABLE public.licitacoes_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes_score_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licitacoes_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own establishment opportunities"
  ON public.licitacoes_opportunities FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert own establishment opportunities"
  ON public.licitacoes_opportunities FOR INSERT
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update own establishment opportunities"
  ON public.licitacoes_opportunities FOR UPDATE
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete own establishment opportunities"
  ON public.licitacoes_opportunities FOR DELETE
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can view own establishment keywords"
  ON public.licitacoes_keywords FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can manage own establishment keywords"
  ON public.licitacoes_keywords FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can view own establishment score config"
  ON public.licitacoes_score_config FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can manage own establishment score config"
  ON public.licitacoes_score_config FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can view own establishment alerts"
  ON public.licitacoes_alerts FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can manage own establishment alerts"
  ON public.licitacoes_alerts FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can view own establishment runs"
  ON public.licitacoes_runs FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can manage own establishment runs"
  ON public.licitacoes_runs FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can view own establishment config"
  ON public.licitacoes_config FOR SELECT
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can manage own establishment config"
  ON public.licitacoes_config FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Service role policies for edge functions
CREATE POLICY "Service role full access opportunities"
  ON public.licitacoes_opportunities FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access keywords"
  ON public.licitacoes_keywords FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access score_config"
  ON public.licitacoes_score_config FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access alerts"
  ON public.licitacoes_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access runs"
  ON public.licitacoes_runs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access config"
  ON public.licitacoes_config FOR ALL
  USING (true)
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_licitacoes_opportunities_estabelecimento ON public.licitacoes_opportunities(estabelecimento_id);
CREATE INDEX idx_licitacoes_opportunities_score ON public.licitacoes_opportunities(score DESC);
CREATE INDEX idx_licitacoes_opportunities_status ON public.licitacoes_opportunities(status);
CREATE INDEX idx_licitacoes_opportunities_data_abertura ON public.licitacoes_opportunities(data_abertura);
CREATE INDEX idx_licitacoes_keywords_estabelecimento ON public.licitacoes_keywords(estabelecimento_id);
CREATE INDEX idx_licitacoes_keywords_categoria ON public.licitacoes_keywords(categoria);