
-- Tabela de pedidos com rastreamento
CREATE TABLE public.pedido_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id),
  orcamento_id UUID REFERENCES public.orcamentos(id),
  customer_id UUID REFERENCES public.customers(id),
  numero_pedido TEXT NOT NULL,
  token_rastreamento TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  email_cliente TEXT,
  status_atual TEXT NOT NULL DEFAULT 'recebido',
  notificar_whatsapp BOOLEAN DEFAULT true,
  notificar_email BOOLEAN DEFAULT false,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token_rastreamento),
  UNIQUE(estabelecimento_id, numero_pedido)
);

-- Histórico de status do pedido
CREATE TABLE public.pedido_tracking_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_tracking_id UUID NOT NULL REFERENCES public.pedido_tracking(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  descricao TEXT,
  observacao TEXT,
  notificado_whatsapp BOOLEAN DEFAULT false,
  notificado_email BOOLEAN DEFAULT false,
  criado_por UUID REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configuração dos status disponíveis por estabelecimento
CREATE TABLE public.pedido_tracking_status_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT '#3b82f6',
  icone TEXT DEFAULT 'Package',
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  mensagem_whatsapp TEXT,
  mensagem_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pedido_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_tracking_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_tracking_status_config ENABLE ROW LEVEL SECURITY;

-- Policies para pedido_tracking
CREATE POLICY "Users can view own establishment pedidos" ON public.pedido_tracking
  FOR SELECT TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert own establishment pedidos" ON public.pedido_tracking
  FOR INSERT TO authenticated WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update own establishment pedidos" ON public.pedido_tracking
  FOR UPDATE TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete own establishment pedidos" ON public.pedido_tracking
  FOR DELETE TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Public access by token for tracking page
CREATE POLICY "Public can view by token" ON public.pedido_tracking
  FOR SELECT TO anon USING (true);

-- Policies para historico
CREATE POLICY "Users can view historico" ON public.pedido_tracking_historico
  FOR SELECT TO authenticated USING (
    pedido_tracking_id IN (SELECT id FROM public.pedido_tracking WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id())
  );

CREATE POLICY "Users can insert historico" ON public.pedido_tracking_historico
  FOR INSERT TO authenticated WITH CHECK (
    pedido_tracking_id IN (SELECT id FROM public.pedido_tracking WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id())
  );

CREATE POLICY "Public can view historico by pedido" ON public.pedido_tracking_historico
  FOR SELECT TO anon USING (true);

-- Policies para status config
CREATE POLICY "Users can manage status config" ON public.pedido_tracking_status_config
  FOR ALL TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Trigger updated_at
CREATE TRIGGER set_pedido_tracking_updated_at
  BEFORE UPDATE ON public.pedido_tracking
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
