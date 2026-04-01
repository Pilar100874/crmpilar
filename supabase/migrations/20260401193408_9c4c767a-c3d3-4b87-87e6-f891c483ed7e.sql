
-- Tabela para armazenar os templates padrão de agentes e suas necessidades de dados
CREATE TABLE public.agent_data_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agent_template_key TEXT NOT NULL,
  campo TEXT NOT NULL,
  label TEXT NOT NULL,
  descricao TEXT,
  fonte_tipo TEXT NOT NULL DEFAULT 'manual' CHECK (fonte_tipo IN ('manual', 'sistema', 'api')),
  valor_manual TEXT,
  tabela_sistema TEXT,
  coluna_sistema TEXT,
  api_endpoint_id UUID REFERENCES public.api_endpoints(id),
  campo_api TEXT,
  configurado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id, agent_template_key, campo)
);

ALTER TABLE public.agent_data_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bindings for their establishment"
ON public.agent_data_bindings
FOR ALL
TO authenticated
USING (public.user_in_estabelecimento(estabelecimento_id))
WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

CREATE TRIGGER update_agent_data_bindings_updated_at
  BEFORE UPDATE ON public.agent_data_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
