-- Tabela de configuração de permissões de envio em massa
CREATE TABLE public.campaign_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL DEFAULT 'Configuração Padrão',
  
  -- Filtros de contatos
  last_contact_days INTEGER NOT NULL DEFAULT 30,
  only_replied BOOLEAN NOT NULL DEFAULT false,
  optin_required BOOLEAN NOT NULL DEFAULT true,
  min_score INTEGER NOT NULL DEFAULT 0,
  allowed_tags TEXT[] DEFAULT '{}',
  blocked_tags TEXT[] DEFAULT '{}',
  
  -- Limites de segurança
  max_per_day INTEGER NOT NULL DEFAULT 100,
  max_per_hour INTEGER NOT NULL DEFAULT 20,
  delay_min_seconds INTEGER NOT NULL DEFAULT 30,
  delay_max_seconds INTEGER NOT NULL DEFAULT 120,
  randomize_text BOOLEAN NOT NULL DEFAULT true,
  include_media BOOLEAN NOT NULL DEFAULT false,
  stop_if_low_response INTEGER DEFAULT 10,
  stop_if_blocks INTEGER DEFAULT 3,
  
  -- Score de risco calculado
  risk_score INTEGER DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de log de envios em massa
CREATE TABLE public.campaign_send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  permission_id UUID REFERENCES public.campaign_permissions(id) ON DELETE SET NULL,
  
  -- Dados do contato
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  
  -- Status do envio
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Motivo (quando bloqueado/pulado)
  skip_reason VARCHAR(255),
  error_message TEXT,
  
  -- Dados do envio
  message_content TEXT,
  template_id UUID,
  
  -- Timestamps
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Resposta
  has_response BOOLEAN DEFAULT false,
  response_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_campaign_permissions_estabelecimento ON public.campaign_permissions(estabelecimento_id);
CREATE INDEX idx_campaign_send_logs_estabelecimento ON public.campaign_send_logs(estabelecimento_id);
CREATE INDEX idx_campaign_send_logs_campaign ON public.campaign_send_logs(campaign_id);
CREATE INDEX idx_campaign_send_logs_customer ON public.campaign_send_logs(customer_id);
CREATE INDEX idx_campaign_send_logs_status ON public.campaign_send_logs(status);
CREATE INDEX idx_campaign_send_logs_created ON public.campaign_send_logs(created_at DESC);

-- RLS
ALTER TABLE public.campaign_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_send_logs ENABLE ROW LEVEL SECURITY;

-- Policies para campaign_permissions
CREATE POLICY "Users can view own establishment permissions"
  ON public.campaign_permissions
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own establishment permissions"
  ON public.campaign_permissions
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own establishment permissions"
  ON public.campaign_permissions
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own establishment permissions"
  ON public.campaign_permissions
  FOR DELETE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Policies para campaign_send_logs
CREATE POLICY "Users can view own establishment logs"
  ON public.campaign_send_logs
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own establishment logs"
  ON public.campaign_send_logs
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own establishment logs"
  ON public.campaign_send_logs
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_campaign_permissions_updated_at
  BEFORE UPDATE ON public.campaign_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_send_logs_updated_at
  BEFORE UPDATE ON public.campaign_send_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();