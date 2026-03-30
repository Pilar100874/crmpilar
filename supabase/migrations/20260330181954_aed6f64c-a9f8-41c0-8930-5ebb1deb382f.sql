
-- Table for e-commerce orders
CREATE TABLE public.pedidos_ecommerce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id),
  numero_pedido TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  nome_cliente TEXT NOT NULL,
  email_cliente TEXT,
  telefone_cliente TEXT,
  cpf_cliente TEXT,
  cnpj_cliente TEXT,
  razao_social TEXT,
  tipo_cliente TEXT NOT NULL DEFAULT 'pf',
  endereco_cep TEXT,
  endereco_rua TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  tipo_pagamento_nome TEXT,
  condicao_pagamento_nome TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC NOT NULL DEFAULT 0,
  frete NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  token_rastreamento TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for order items
CREATE TABLE public.pedidos_ecommerce_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos_ecommerce(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  nome_produto TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos_ecommerce ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_ecommerce_itens ENABLE ROW LEVEL SECURITY;

-- Public insert (checkout doesn't require auth)
CREATE POLICY "Anyone can create ecommerce orders"
  ON public.pedidos_ecommerce FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert order items"
  ON public.pedidos_ecommerce_itens FOR INSERT
  WITH CHECK (true);

-- Read by token (public tracking)
CREATE POLICY "Anyone can read orders by token"
  ON public.pedidos_ecommerce FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read order items"
  ON public.pedidos_ecommerce_itens FOR SELECT
  USING (true);

-- Staff can update orders
CREATE POLICY "Staff can update orders"
  ON public.pedidos_ecommerce FOR UPDATE
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Indexes
CREATE INDEX idx_pedidos_ecommerce_estabelecimento ON public.pedidos_ecommerce(estabelecimento_id);
CREATE INDEX idx_pedidos_ecommerce_email ON public.pedidos_ecommerce(email_cliente);
CREATE INDEX idx_pedidos_ecommerce_token ON public.pedidos_ecommerce(token_rastreamento);
CREATE INDEX idx_pedidos_ecommerce_numero ON public.pedidos_ecommerce(numero_pedido);
CREATE INDEX idx_pedidos_ecommerce_itens_pedido ON public.pedidos_ecommerce_itens(pedido_id);

-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS pedido_ecommerce_seq START 1;

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_pedido_ecommerce_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.numero_pedido := 'PED-' || to_char(now(), 'YYYY') || lpad(nextval('pedido_ecommerce_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pedido_ecommerce_numero
  BEFORE INSERT ON public.pedidos_ecommerce
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_pedido_ecommerce_numero();

-- Updated_at trigger
CREATE TRIGGER set_pedidos_ecommerce_updated_at
  BEFORE UPDATE ON public.pedidos_ecommerce
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
