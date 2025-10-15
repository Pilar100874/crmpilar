-- Tabela para armazenar fluxos de bot
CREATE TABLE IF NOT EXISTS public.bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  flow_data JSONB NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para sessões de chat
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  context JSONB DEFAULT '{"vars": {}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for bot_flows
CREATE POLICY "Authenticated users can view bot flows"
  ON public.bot_flows FOR SELECT
  USING (true);

CREATE POLICY "Admins and gestores can manage bot flows"
  ON public.bot_flows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
  );

-- Policies for chat_sessions
CREATE POLICY "Users can manage their own sessions"
  ON public.chat_sessions FOR ALL
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_bot_flows_updated_at
  BEFORE UPDATE ON public.bot_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();