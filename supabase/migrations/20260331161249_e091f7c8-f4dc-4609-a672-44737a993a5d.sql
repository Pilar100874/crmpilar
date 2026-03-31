
-- Tabela unificada de pedidos recebidos
CREATE TABLE public.pedidos_recebidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id),
  origem TEXT NOT NULL, -- 'ecommerce', 'orcamento', 'marketplace', 'manual'
  origem_id TEXT, -- ID na tabela de origem
  origem_detalhes TEXT, -- ex: nome do marketplace
  numero_pedido TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  email_cliente TEXT,
  documento_cliente TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_frete NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  forma_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'novo', -- novo, confirmado, em_separacao, embalando, pronto_despacho, despachado, entregue, cancelado
  status_fulfillment TEXT NOT NULL DEFAULT 'aguardando', -- aguardando, separando, embalando, pronto, despachado
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  endereco_cep TEXT,
  peso_total NUMERIC,
  volumes INTEGER DEFAULT 1,
  transportadora TEXT,
  codigo_rastreio TEXT,
  rota_id UUID,
  veiculo_id UUID,
  observacoes TEXT,
  data_pedido TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_separacao TIMESTAMPTZ,
  data_embalagem TIMESTAMPTZ,
  data_despacho TIMESTAMPTZ,
  data_entrega TIMESTAMPTZ,
  itens_json JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos_recebidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_recebidos_select" ON public.pedidos_recebidos
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "pedidos_recebidos_insert" ON public.pedidos_recebidos
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "pedidos_recebidos_update" ON public.pedidos_recebidos
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "pedidos_recebidos_delete" ON public.pedidos_recebidos
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE INDEX idx_pedidos_recebidos_estab ON public.pedidos_recebidos(estabelecimento_id);
CREATE INDEX idx_pedidos_recebidos_origem ON public.pedidos_recebidos(origem);
CREATE INDEX idx_pedidos_recebidos_status ON public.pedidos_recebidos(status_fulfillment);
CREATE INDEX idx_pedidos_recebidos_data ON public.pedidos_recebidos(data_pedido);

-- Trigger updated_at
CREATE TRIGGER update_pedidos_recebidos_updated_at
  BEFORE UPDATE ON public.pedidos_recebidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Configuração de etiquetas
CREATE TABLE public.etiqueta_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL DEFAULT 'Padrão',
  campos_visiveis JSONB NOT NULL DEFAULT '["numero_pedido","nome_cliente","endereco","cidade_estado","cep","itens","volumes","peso","transportadora","codigo_rastreio","codigo_barras","data_pedido"]'::jsonb,
  formato TEXT NOT NULL DEFAULT 'A4', -- A4, 10x15, etiqueta_correios
  largura_mm INTEGER DEFAULT 100,
  altura_mm INTEGER DEFAULT 150,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.etiqueta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etiqueta_config_select" ON public.etiqueta_config
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "etiqueta_config_insert" ON public.etiqueta_config
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "etiqueta_config_update" ON public.etiqueta_config
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "etiqueta_config_delete" ON public.etiqueta_config
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER update_etiqueta_config_updated_at
  BEFORE UPDATE ON public.etiqueta_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
