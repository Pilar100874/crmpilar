-- ========================================
-- SELF-SERVICE PORTAL
-- ========================================

-- Tabela de artigos públicos do portal
CREATE TABLE IF NOT EXISTS public.portal_artigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  kb_artigo_id UUID REFERENCES public.kb_artigos(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  tags TEXT[],
  visualizacoes INTEGER DEFAULT 0,
  ajudou INTEGER DEFAULT 0,
  nao_ajudou INTEGER DEFAULT 0,
  publicado BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estabelecimento_id, slug)
);

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS public.portal_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  assunto VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  prioridade VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'aberto',
  atribuido_a UUID REFERENCES public.usuarios(id),
  conversa_id UUID REFERENCES public.conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de respostas aos tickets
CREATE TABLE IF NOT EXISTS public.portal_ticket_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.portal_tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  customer_id UUID REFERENCES public.customers(id),
  mensagem TEXT NOT NULL,
  is_cliente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- OMNICHANNEL CONTINUITY
-- ========================================

-- Tabela de sessões omnichannel
CREATE TABLE IF NOT EXISTS public.omnichannel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  canais_ativos TEXT[] DEFAULT '{}',
  contexto_compartilhado JSONB DEFAULT '{}',
  ultima_interacao TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transições entre canais
CREATE TABLE IF NOT EXISTS public.canal_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.omnichannel_sessions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  canal_origem VARCHAR(50) NOT NULL,
  canal_destino VARCHAR(50) NOT NULL,
  conversa_origem_id UUID REFERENCES public.conversations(id),
  conversa_destino_id UUID REFERENCES public.conversations(id),
  contexto_transferido JSONB,
  motivo VARCHAR(255),
  sucesso BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de preferências de canal por cliente
CREATE TABLE IF NOT EXISTS public.customer_canal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  canal VARCHAR(50) NOT NULL,
  preferencia_ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, canal)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_portal_artigos_estabelecimento ON public.portal_artigos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_portal_artigos_slug ON public.portal_artigos(slug);
CREATE INDEX IF NOT EXISTS idx_portal_artigos_publicado ON public.portal_artigos(publicado);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_estabelecimento ON public.portal_tickets(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_customer ON public.portal_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_status ON public.portal_tickets(status);
CREATE INDEX IF NOT EXISTS idx_omnichannel_sessions_customer ON public.omnichannel_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_sessions_token ON public.omnichannel_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_omnichannel_sessions_ativa ON public.omnichannel_sessions(ativa);
CREATE INDEX IF NOT EXISTS idx_canal_transitions_session ON public.canal_transitions(session_id);
CREATE INDEX IF NOT EXISTS idx_canal_transitions_customer ON public.canal_transitions(customer_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_portal_artigos_updated_at
  BEFORE UPDATE ON public.portal_artigos
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_updated_at();

CREATE TRIGGER trigger_portal_tickets_updated_at
  BEFORE UPDATE ON public.portal_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_updated_at();

CREATE TRIGGER trigger_omnichannel_sessions_updated_at
  BEFORE UPDATE ON public.omnichannel_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_updated_at();

CREATE TRIGGER trigger_customer_canal_preferences_updated_at
  BEFORE UPDATE ON public.customer_canal_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_updated_at();

-- RLS Policies - Portal
ALTER TABLE public.portal_artigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artigos públicos podem ser vistos por todos" ON public.portal_artigos FOR SELECT USING (publicado = true);
CREATE POLICY "Admins e gestores gerenciam artigos" ON public.portal_artigos FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

ALTER TABLE public.portal_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes veem seus tickets" ON public.portal_tickets FOR SELECT
  USING (customer_id IN (SELECT id FROM public.customers WHERE telefone = (auth.jwt() ->> 'phone')));
CREATE POLICY "Admins e gestores gerenciam tickets" ON public.portal_tickets FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

ALTER TABLE public.portal_ticket_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem respostas de seus tickets" ON public.portal_ticket_respostas FOR SELECT USING (true);
CREATE POLICY "Sistema pode criar respostas" ON public.portal_ticket_respostas FOR INSERT WITH CHECK (true);

-- RLS Policies - Omnichannel
ALTER TABLE public.omnichannel_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sistema gerencia sessões" ON public.omnichannel_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.canal_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem transições do estabelecimento" ON public.canal_transitions FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Sistema cria transições" ON public.canal_transitions FOR INSERT WITH CHECK (true);

ALTER TABLE public.customer_canal_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem preferências do estabelecimento" ON public.customer_canal_preferences FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );
CREATE POLICY "Sistema gerencia preferências" ON public.customer_canal_preferences FOR ALL USING (true) WITH CHECK (true);