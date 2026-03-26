
-- Tabela de sessões de chat com agentes
CREATE TABLE public.agent_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.chat_agents(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de mensagens do chat com agentes
CREATE TABLE public.agent_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.agent_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agent_chat_sessions_agent ON public.agent_chat_sessions(agent_id);
CREATE INDEX idx_agent_chat_sessions_usuario ON public.agent_chat_sessions(usuario_id);
CREATE INDEX idx_agent_chat_messages_session ON public.agent_chat_messages(session_id);

-- Trigger updated_at
CREATE TRIGGER update_agent_chat_sessions_updated_at
  BEFORE UPDATE ON public.agent_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.agent_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for sessions
CREATE POLICY "Users can manage own agent chat sessions"
  ON public.agent_chat_sessions
  FOR ALL
  TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Policies for messages
CREATE POLICY "Users can manage messages in own sessions"
  ON public.agent_chat_messages
  FOR ALL
  TO authenticated
  USING (session_id IN (SELECT id FROM public.agent_chat_sessions WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())))
  WITH CHECK (session_id IN (SELECT id FROM public.agent_chat_sessions WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())));
