-- Tabela de marketplaces disponíveis
CREATE TABLE public.marketplaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  nome_display VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pré-popular com os marketplaces
INSERT INTO public.marketplaces (nome, nome_display, descricao, icone) VALUES
  ('mercado_livre', 'Mercado Livre', 'Maior marketplace da América Latina', 'shopping-bag'),
  ('shopee', 'Shopee', 'Marketplace asiático com forte presença no Brasil', 'package'),
  ('amazon', 'Amazon Brasil', 'Gigante do e-commerce mundial', 'box'),
  ('magalu', 'Magazine Luiza', 'Marketplace brasileiro tradicional', 'store'),
  ('google_merchant', 'Google Shopping', 'Vitrine de produtos no Google', 'search');

-- Tabela de contas de marketplace por estabelecimento
CREATE TABLE public.contas_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  nome_loja VARCHAR(200) NOT NULL,
  seller_id VARCHAR(200),
  status VARCHAR(50) DEFAULT 'nao_conectado',
  access_token TEXT,
  refresh_token TEXT,
  data_expiracao_token TIMESTAMP WITH TIME ZONE,
  ambiente VARCHAR(20) DEFAULT 'sandbox',
  configuracoes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de produtos vinculados aos marketplaces
CREATE TABLE public.marketplace_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  conta_marketplace_id UUID NOT NULL REFERENCES public.contas_marketplace(id) ON DELETE CASCADE,
  sku_marketplace VARCHAR(200),
  titulo_marketplace VARCHAR(500),
  url_anuncio TEXT,
  status VARCHAR(50) DEFAULT 'nao_listado',
  ultimo_sync TIMESTAMP WITH TIME ZONE,
  mensagem_erro TEXT,
  dados_extras JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(produto_id, conta_marketplace_id)
);

-- Tabela de pedidos dos marketplaces
CREATE TABLE public.pedidos_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  conta_marketplace_id UUID NOT NULL REFERENCES public.contas_marketplace(id) ON DELETE CASCADE,
  marketplace_id UUID NOT NULL REFERENCES public.marketplaces(id) ON DELETE CASCADE,
  id_pedido_marketplace VARCHAR(200) NOT NULL,
  data_pedido TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'novo',
  valor_total NUMERIC(12,2) NOT NULL,
  moeda VARCHAR(10) DEFAULT 'BRL',
  nome_cliente VARCHAR(300),
  endereco_entrega JSONB,
  dados_brutos_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conta_marketplace_id, id_pedido_marketplace)
);

-- Tabela de itens dos pedidos de marketplace
CREATE TABLE public.pedidos_marketplace_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_marketplace_id UUID NOT NULL REFERENCES public.pedidos_marketplace(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  marketplace_produto_id UUID REFERENCES public.marketplace_produtos(id) ON DELETE SET NULL,
  sku VARCHAR(200),
  nome VARCHAR(500) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de logs de operações
CREATE TABLE public.marketplace_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  conta_marketplace_id UUID REFERENCES public.contas_marketplace(id) ON DELETE SET NULL,
  marketplace_id UUID REFERENCES public.marketplaces(id) ON DELETE SET NULL,
  tipo VARCHAR(100) NOT NULL,
  mensagem TEXT NOT NULL,
  detalhes JSONB,
  sucesso BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_marketplace_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para marketplaces (público para leitura)
CREATE POLICY "Todos podem ver marketplaces" ON public.marketplaces
  FOR SELECT USING (true);

CREATE POLICY "Admins podem gerenciar marketplaces" ON public.marketplaces
  FOR ALL USING (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()));

-- Políticas para contas_marketplace
CREATE POLICY "Usuários podem ver contas do estabelecimento" ON public.contas_marketplace
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem gerenciar contas do estabelecimento" ON public.contas_marketplace
  FOR ALL USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas para marketplace_produtos
CREATE POLICY "Usuários podem ver produtos marketplace do estabelecimento" ON public.marketplace_produtos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contas_marketplace cm
      WHERE cm.id = marketplace_produtos.conta_marketplace_id
      AND (cm.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
           EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Usuários podem gerenciar produtos marketplace do estabelecimento" ON public.marketplace_produtos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contas_marketplace cm
      WHERE cm.id = marketplace_produtos.conta_marketplace_id
      AND (cm.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
           EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- Políticas para pedidos_marketplace
CREATE POLICY "Usuários podem ver pedidos do estabelecimento" ON public.pedidos_marketplace
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem gerenciar pedidos do estabelecimento" ON public.pedidos_marketplace
  FOR ALL USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas para itens de pedidos
CREATE POLICY "Usuários podem ver itens de pedidos" ON public.pedidos_marketplace_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pedidos_marketplace pm
      WHERE pm.id = pedidos_marketplace_itens.pedido_marketplace_id
      AND (pm.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
           EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Usuários podem gerenciar itens de pedidos" ON public.pedidos_marketplace_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pedidos_marketplace pm
      WHERE pm.id = pedidos_marketplace_itens.pedido_marketplace_id
      AND (pm.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
           EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- Políticas para logs
CREATE POLICY "Usuários podem ver logs do estabelecimento" ON public.marketplace_logs
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode criar logs" ON public.marketplace_logs
  FOR INSERT WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_contas_marketplace_estabelecimento ON public.contas_marketplace(estabelecimento_id);
CREATE INDEX idx_contas_marketplace_marketplace ON public.contas_marketplace(marketplace_id);
CREATE INDEX idx_marketplace_produtos_conta ON public.marketplace_produtos(conta_marketplace_id);
CREATE INDEX idx_marketplace_produtos_produto ON public.marketplace_produtos(produto_id);
CREATE INDEX idx_pedidos_marketplace_estabelecimento ON public.pedidos_marketplace(estabelecimento_id);
CREATE INDEX idx_pedidos_marketplace_conta ON public.pedidos_marketplace(conta_marketplace_id);
CREATE INDEX idx_pedidos_marketplace_data ON public.pedidos_marketplace(data_pedido DESC);
CREATE INDEX idx_marketplace_logs_conta ON public.marketplace_logs(conta_marketplace_id);
CREATE INDEX idx_marketplace_logs_data ON public.marketplace_logs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_contas_marketplace_updated_at
  BEFORE UPDATE ON public.contas_marketplace
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_produtos_updated_at
  BEFORE UPDATE ON public.marketplace_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_marketplace_updated_at
  BEFORE UPDATE ON public.pedidos_marketplace
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();