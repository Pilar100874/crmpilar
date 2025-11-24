-- Criar tabela de configuração de SLA
CREATE TABLE IF NOT EXISTS public.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  fila_id UUID REFERENCES public.filas_atendimento(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Tempos de resposta (em segundos)
  tempo_primeira_resposta INTEGER NOT NULL DEFAULT 300, -- 5 minutos
  tempo_resposta_subsequente INTEGER NOT NULL DEFAULT 600, -- 10 minutos
  tempo_resolucao INTEGER NOT NULL DEFAULT 3600, -- 1 hora
  
  -- Horários de funcionamento (considera horário para cálculo de SLA)
  considera_horario_comercial BOOLEAN DEFAULT true,
  horario_funcionamento JSONB DEFAULT '{"24h": true}'::jsonb,
  
  -- Prioridades (multiplicadores de tempo por prioridade do chat)
  multiplicador_urgente DECIMAL(3,2) DEFAULT 0.5, -- 50% do tempo
  multiplicador_alta DECIMAL(3,2) DEFAULT 0.75, -- 75% do tempo
  multiplicador_normal DECIMAL(3,2) DEFAULT 1.0, -- 100% do tempo
  multiplicador_baixa DECIMAL(3,2) DEFAULT 1.5, -- 150% do tempo
  
  -- Ações automáticas
  alerta_porcentagem INTEGER DEFAULT 80, -- Alertar quando atingir X% do tempo
  escalar_automaticamente BOOLEAN DEFAULT false,
  fila_escalacao_id UUID REFERENCES public.filas_atendimento(id) ON DELETE SET NULL,
  
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir apenas uma config padrão por estabelecimento
  CONSTRAINT unique_default_sla_per_estabelecimento UNIQUE NULLS NOT DISTINCT (estabelecimento_id, fila_id)
);

-- Criar índices
CREATE INDEX idx_sla_config_estabelecimento ON public.sla_config(estabelecimento_id);
CREATE INDEX idx_sla_config_fila ON public.sla_config(fila_id);
CREATE INDEX idx_sla_config_ativo ON public.sla_config(ativo) WHERE ativo = true;

-- Criar tabela de violações de SLA
CREATE TABLE IF NOT EXISTS public.sla_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sla_config_id UUID NOT NULL REFERENCES public.sla_config(id) ON DELETE CASCADE,
  
  tipo_violacao TEXT NOT NULL CHECK (tipo_violacao IN ('primeira_resposta', 'resposta_subsequente', 'resolucao')),
  
  -- Tempos
  tempo_esperado INTEGER NOT NULL, -- em segundos
  tempo_real INTEGER NOT NULL, -- em segundos
  tempo_excedido INTEGER NOT NULL, -- em segundos
  porcentagem_excedida DECIMAL(5,2) NOT NULL,
  
  -- Contexto
  prioridade_chat TEXT,
  fila_id UUID REFERENCES public.filas_atendimento(id) ON DELETE SET NULL,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE SET NULL,
  
  -- Ações tomadas
  alerta_enviado BOOLEAN DEFAULT false,
  escalado BOOLEAN DEFAULT false,
  escalado_para_fila_id UUID REFERENCES public.filas_atendimento(id) ON DELETE SET NULL,
  escalado_at TIMESTAMPTZ,
  
  -- Metadados
  resolvido BOOLEAN DEFAULT false,
  resolvido_at TIMESTAMPTZ,
  notas TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Garantir apenas uma violação por tipo por conversa
  CONSTRAINT unique_violation_per_conversation_type UNIQUE (conversation_id, tipo_violacao)
);

-- Criar índices
CREATE INDEX idx_sla_violations_conversation ON public.sla_violations(conversation_id);
CREATE INDEX idx_sla_violations_config ON public.sla_violations(sla_config_id);
CREATE INDEX idx_sla_violations_tipo ON public.sla_violations(tipo_violacao);
CREATE INDEX idx_sla_violations_resolvido ON public.sla_violations(resolvido) WHERE resolvido = false;
CREATE INDEX idx_sla_violations_created ON public.sla_violations(created_at DESC);

-- Adicionar campos de SLA à tabela conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS sla_config_id UUID REFERENCES public.sla_config(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sla_primeira_resposta_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_tempo_primeira_resposta INTEGER, -- em segundos
ADD COLUMN IF NOT EXISTS sla_violacao_primeira_resposta BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_ultima_resposta_cliente_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_violacao_resposta_subsequente BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_violacao_resolucao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sla_tempo_total_resolucao INTEGER; -- em segundos

-- Criar índice para consultas de SLA
CREATE INDEX IF NOT EXISTS idx_conversations_sla_config ON public.conversations(sla_config_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sla_violations ON public.conversations(estabelecimento_id, chat_status) 
  WHERE sla_violacao_primeira_resposta = true 
    OR sla_violacao_resposta_subsequente = true 
    OR sla_violacao_resolucao = true;

-- Criar trigger para updated_at em sla_config
CREATE OR REPLACE FUNCTION update_sla_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_sla_config_updated_at
  BEFORE UPDATE ON public.sla_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_config_updated_at();

-- Habilitar RLS
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_violations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sla_config
CREATE POLICY "Usuários podem ver configs de SLA do estabelecimento"
  ON public.sla_config FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Admins e gestores podem gerenciar configs de SLA"
  ON public.sla_config FOR ALL
  USING (
    (
      estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role) 
        OR has_role(auth.uid(), 'gestor'::app_role)
      )
    )
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    OR NOT roles_present()
  );

-- Políticas RLS para sla_violations
CREATE POLICY "Usuários podem ver violações de SLA do estabelecimento"
  ON public.sla_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = sla_violations.conversation_id
        AND (
          c.estabelecimento_id IN (
            SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
          )
          OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
        )
    )
  );

CREATE POLICY "Sistema pode criar violações de SLA"
  ON public.sla_violations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins e gestores podem gerenciar violações de SLA"
  ON public.sla_violations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = sla_violations.conversation_id
        AND (
          (
            c.estabelecimento_id IN (
              SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
            )
            AND (
              has_role(auth.uid(), 'admin'::app_role) 
              OR has_role(auth.uid(), 'gestor'::app_role)
            )
          )
          OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
          OR NOT roles_present()
        )
    )
  );

-- Habilitar Realtime para monitoramento em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_violations;