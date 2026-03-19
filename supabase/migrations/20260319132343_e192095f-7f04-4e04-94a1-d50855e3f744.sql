
-- Strategy Engine Projects
CREATE TABLE public.strategy_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.usuarios(id),
  nome TEXT NOT NULL,
  descricao_negocio TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  strategic_memory JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strategy_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strategy projects"
  ON public.strategy_projects FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Agent Executions
CREATE TABLE public.strategy_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.strategy_projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  validation_score NUMERIC(5,2),
  validation_details JSONB,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strategy_agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent executions"
  ON public.strategy_agent_executions FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.strategy_projects WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Strategy Artifacts
CREATE TABLE public.strategy_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.strategy_projects(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.strategy_agent_executions(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '{}',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strategy_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own artifacts"
  ON public.strategy_artifacts FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.strategy_projects WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Strategy Chat Messages
CREATE TABLE public.strategy_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.strategy_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.strategy_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat messages"
  ON public.strategy_chat_messages FOR ALL TO authenticated
  USING (project_id IN (SELECT id FROM public.strategy_projects WHERE estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- Agent Configurations (Admin)
CREATE TABLE public.strategy_agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 0,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id, agent_type)
);

ALTER TABLE public.strategy_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage agent configs"
  ON public.strategy_agent_configs FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Triggers for updated_at
CREATE TRIGGER update_strategy_projects_updated_at BEFORE UPDATE ON public.strategy_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_strategy_agent_executions_updated_at BEFORE UPDATE ON public.strategy_agent_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_strategy_artifacts_updated_at BEFORE UPDATE ON public.strategy_artifacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_strategy_agent_configs_updated_at BEFORE UPDATE ON public.strategy_agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
