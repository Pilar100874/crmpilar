
-- Tabela de bases de conhecimento por domínio
CREATE TABLE public.agent_knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  dominio TEXT NOT NULL, -- comercial, clientes, recompra, mix, financeira, logistica, margem, objecoes, tecnica, excecoes, performance
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'texto', -- texto, json, regra
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de decisão do orquestrador
CREATE TABLE public.agent_decision_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.agent_chat_sessions(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  orquestrador_id UUID REFERENCES public.chat_agents(id) ON DELETE SET NULL,
  intencao_detectada TEXT,
  agentes_acionados TEXT[] DEFAULT '{}',
  contexto_resumido TEXT,
  decisao TEXT,
  confianca NUMERIC(5,2) DEFAULT 0,
  tempo_resposta_ms INTEGER DEFAULT 0,
  escalonado_humano BOOLEAN DEFAULT false,
  motivo_escalonamento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de eventos de escalonamento
CREATE TABLE public.agent_escalation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.agent_chat_sessions(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.chat_agents(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral', -- conflito, credito, tecnico, juridico, reclamacao, excecao
  severidade TEXT NOT NULL DEFAULT 'media', -- baixa, media, alta, critica
  resolvido BOOLEAN DEFAULT false,
  resolvido_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de métricas de performance por agente
CREATE TABLE public.agent_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  periodo_inicio TIMESTAMPTZ NOT NULL,
  periodo_fim TIMESTAMPTZ NOT NULL,
  total_interacoes INTEGER DEFAULT 0,
  total_resolvido_sem_humano INTEGER DEFAULT 0,
  total_escalonamentos INTEGER DEFAULT 0,
  tempo_medio_resposta_ms INTEGER DEFAULT 0,
  taxa_conversao NUMERIC(5,2) DEFAULT 0,
  ticket_medio NUMERIC(12,2) DEFAULT 0,
  cross_sell_gerado INTEGER DEFAULT 0,
  objecoes_recuperadas INTEGER DEFAULT 0,
  satisfacao_media NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de regras de negócio dos agentes
CREATE TABLE public.agent_business_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL, -- escalonamento, venda, credito, desconto, frete, objecao
  nome TEXT NOT NULL,
  descricao TEXT,
  condicao TEXT NOT NULL, -- descrição da condição em texto
  acao TEXT NOT NULL, -- ação a ser tomada
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de objeções e respostas
CREATE TABLE public.agent_objections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL DEFAULT 'preco', -- preco, prazo, qualidade, confianca, concorrencia, outros
  objecao TEXT NOT NULL,
  resposta_sugerida TEXT NOT NULL,
  gatilhos_mentais TEXT,
  argumentos TEXT,
  eficacia_percentual NUMERIC(5,2) DEFAULT 0,
  vezes_usada INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de recomendações de cross-sell
CREATE TABLE public.agent_cross_sell_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  produto_origem TEXT NOT NULL,
  produto_sugerido TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'complementar', -- complementar, similar, upsell, kit
  motivo TEXT,
  prioridade INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_cross_sell_rules ENABLE ROW LEVEL SECURITY;

-- Policies para usuários autenticados do mesmo estabelecimento
CREATE POLICY "Users can manage their agent_knowledge_bases" ON public.agent_knowledge_bases FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_decision_logs" ON public.agent_decision_logs FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_escalation_events" ON public.agent_escalation_events FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_performance_metrics" ON public.agent_performance_metrics FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_business_rules" ON public.agent_business_rules FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_objections" ON public.agent_objections FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can manage their agent_cross_sell_rules" ON public.agent_cross_sell_rules FOR ALL TO authenticated USING (public.user_in_estabelecimento(estabelecimento_id)) WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

-- Triggers de updated_at
CREATE TRIGGER set_agent_knowledge_bases_updated_at BEFORE UPDATE ON public.agent_knowledge_bases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_agent_business_rules_updated_at BEFORE UPDATE ON public.agent_business_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_agent_objections_updated_at BEFORE UPDATE ON public.agent_objections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
