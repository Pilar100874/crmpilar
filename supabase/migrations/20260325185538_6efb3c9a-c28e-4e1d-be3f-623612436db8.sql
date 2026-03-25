
-- Tabela de agentes de chat
CREATE TABLE public.chat_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT NOT NULL DEFAULT '🤖',
  cor TEXT NOT NULL DEFAULT '#8B5CF6',
  modo_operacao TEXT NOT NULL DEFAULT 'sugerir' CHECK (modo_operacao IN ('sugerir', 'automatico')),
  system_prompt TEXT NOT NULL DEFAULT '',
  modelo_ia TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  knowledge_base_type TEXT NOT NULL DEFAULT 'nenhuma' CHECK (knowledge_base_type IN ('nenhuma', 'interna', 'externa')),
  knowledge_base_internal_data JSONB DEFAULT '[]'::jsonb,
  api_endpoint_ids UUID[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de arquivos de KB externa dos agentes
CREATE TABLE public.chat_agent_kb_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agent_kb_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage chat agents of their establishment"
  ON public.chat_agents
  FOR ALL
  TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id))
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Users can manage chat agent KB files"
  ON public.chat_agent_kb_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_agents ca
      WHERE ca.id = chat_agent_kb_files.agent_id
      AND public.user_in_estabelecimento(ca.estabelecimento_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_agents ca
      WHERE ca.id = chat_agent_kb_files.agent_id
      AND public.user_in_estabelecimento(ca.estabelecimento_id)
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_chat_agents_updated_at
  BEFORE UPDATE ON public.chat_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
