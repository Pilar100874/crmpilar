-- Tabela de plataformas de anúncios
CREATE TABLE public.ad_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  nome_display VARCHAR(100) NOT NULL,
  icone VARCHAR(50),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de contas de anúncios
CREATE TABLE public.ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  plataforma_id UUID NOT NULL REFERENCES public.ad_platforms(id) ON DELETE CASCADE,
  nome_conta VARCHAR(255) NOT NULL,
  credenciais_json JSONB,
  status VARCHAR(50) DEFAULT 'nao_conectado',
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de insights de anúncios
CREATE TABLE public.ad_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  conta_id UUID NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  plataforma_id UUID NOT NULL REFERENCES public.ad_platforms(id) ON DELETE CASCADE,
  campanha VARCHAR(500),
  conjunto VARCHAR(500),
  anuncio VARCHAR(500),
  data DATE NOT NULL,
  gastos NUMERIC(15,2) DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  impressoes INTEGER DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  receita NUMERIC(15,2) DEFAULT 0,
  roas NUMERIC(10,4),
  cpc NUMERIC(10,4),
  cpm NUMERIC(10,4),
  ctr NUMERIC(10,6),
  dados_brutos_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de vendas atribuídas
CREATE TABLE public.vendas_atribuidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  plataforma_id UUID NOT NULL REFERENCES public.ad_platforms(id) ON DELETE CASCADE,
  campanha VARCHAR(500),
  anuncio VARCHAR(500),
  valor_venda NUMERIC(15,2) NOT NULL,
  data_venda DATE NOT NULL,
  origem VARCHAR(255),
  pedido_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de logs de coleta
CREATE TABLE public.ads_logs_coleta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  plataforma_id UUID REFERENCES public.ad_platforms(id) ON DELETE SET NULL,
  tipo VARCHAR(50) NOT NULL,
  mensagem TEXT,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de automações de ads
CREATE TABLE public.ads_automacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir plataformas padrão
INSERT INTO public.ad_platforms (nome, nome_display, icone) VALUES
  ('google_ads', 'Google Ads', 'Search'),
  ('meta_ads', 'Meta Ads', 'Facebook'),
  ('tiktok_ads', 'TikTok Ads', 'Music'),
  ('mercadolivre_ads', 'Mercado Livre Ads', 'ShoppingBag'),
  ('amazon_ads', 'Amazon Ads', 'Package');

-- Índices
CREATE INDEX idx_ad_accounts_estabelecimento ON public.ad_accounts(estabelecimento_id);
CREATE INDEX idx_ad_insights_estabelecimento ON public.ad_insights(estabelecimento_id);
CREATE INDEX idx_ad_insights_data ON public.ad_insights(data);
CREATE INDEX idx_ad_insights_conta ON public.ad_insights(conta_id);
CREATE INDEX idx_vendas_atribuidas_estabelecimento ON public.vendas_atribuidas(estabelecimento_id);
CREATE INDEX idx_ads_logs_coleta_estabelecimento ON public.ads_logs_coleta(estabelecimento_id);
CREATE INDEX idx_ads_automacoes_estabelecimento ON public.ads_automacoes(estabelecimento_id);

-- RLS
ALTER TABLE public.ad_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas_atribuidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_logs_coleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads_automacoes ENABLE ROW LEVEL SECURITY;

-- Políticas para ad_platforms (todos podem ver)
CREATE POLICY "Todos podem ver plataformas" ON public.ad_platforms FOR SELECT USING (true);

-- Políticas para ad_accounts
CREATE POLICY "Usuários podem ver contas do estabelecimento" ON public.ad_accounts FOR SELECT
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

CREATE POLICY "Usuários podem gerenciar contas do estabelecimento" ON public.ad_accounts FOR ALL
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

-- Políticas para ad_insights
CREATE POLICY "Usuários podem ver insights do estabelecimento" ON public.ad_insights FOR SELECT
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

CREATE POLICY "Sistema pode inserir insights" ON public.ad_insights FOR INSERT WITH CHECK (true);

-- Políticas para vendas_atribuidas
CREATE POLICY "Usuários podem ver vendas do estabelecimento" ON public.vendas_atribuidas FOR SELECT
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

CREATE POLICY "Sistema pode inserir vendas" ON public.vendas_atribuidas FOR INSERT WITH CHECK (true);

-- Políticas para ads_logs_coleta
CREATE POLICY "Usuários podem ver logs do estabelecimento" ON public.ads_logs_coleta FOR SELECT
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

CREATE POLICY "Sistema pode inserir logs" ON public.ads_logs_coleta FOR INSERT WITH CHECK (true);

-- Políticas para ads_automacoes
CREATE POLICY "Usuários podem gerenciar automações do estabelecimento" ON public.ads_automacoes FOR ALL
  USING ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())));

-- Trigger para updated_at
CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON public.ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ads_automacoes_updated_at BEFORE UPDATE ON public.ads_automacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();