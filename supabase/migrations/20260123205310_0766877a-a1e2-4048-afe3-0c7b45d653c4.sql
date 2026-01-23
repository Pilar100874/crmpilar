-- Tabela para sessões de compartilhamento de tela
CREATE TABLE public.screen_share_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  session_code VARCHAR(8) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para sinais WebRTC
CREATE TABLE public.screen_share_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.screen_share_sessions(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screen_share_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screen_share_signals ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar participação na sessão
CREATE OR REPLACE FUNCTION public.is_screen_share_participant(session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.screen_share_sessions s
    JOIN public.usuarios u ON (u.id = s.host_user_id OR u.id = s.guest_user_id)
    WHERE s.id = session_id AND u.auth_user_id = auth.uid()
  )
$$;

-- Função para verificar se é host da sessão
CREATE OR REPLACE FUNCTION public.is_screen_share_host(session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.screen_share_sessions s
    JOIN public.usuarios u ON u.id = s.host_user_id
    WHERE s.id = session_id AND u.auth_user_id = auth.uid()
  )
$$;

-- Função para verificar se usuário atual é o host
CREATE OR REPLACE FUNCTION public.current_user_is_host(host_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = host_user_id AND u.auth_user_id = auth.uid()
  )
$$;

-- Policies para screen_share_sessions
CREATE POLICY "Users can view sessions they participate in" 
ON public.screen_share_sessions 
FOR SELECT 
USING (
  public.current_user_is_host(host_user_id) OR 
  (guest_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id = guest_user_id AND u.auth_user_id = auth.uid()
  )) OR
  (status = 'waiting' AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
);

CREATE POLICY "Users can create their own sessions" 
ON public.screen_share_sessions 
FOR INSERT 
WITH CHECK (public.current_user_is_host(host_user_id));

CREATE POLICY "Participants can update sessions" 
ON public.screen_share_sessions 
FOR UPDATE 
USING (
  public.current_user_is_host(host_user_id) OR 
  (guest_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.usuarios u WHERE u.id = guest_user_id AND u.auth_user_id = auth.uid()
  )) OR
  (status = 'waiting' AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
);

CREATE POLICY "Hosts can delete their sessions" 
ON public.screen_share_sessions 
FOR DELETE 
USING (public.current_user_is_host(host_user_id));

-- Policies para screen_share_signals
CREATE POLICY "Participants can view signals" 
ON public.screen_share_signals 
FOR SELECT 
USING (public.is_screen_share_participant(session_id));

CREATE POLICY "Participants can create signals" 
ON public.screen_share_signals 
FOR INSERT 
WITH CHECK (public.is_screen_share_participant(session_id));

-- Trigger para updated_at
CREATE TRIGGER update_screen_share_sessions_updated_at
BEFORE UPDATE ON public.screen_share_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime para sinais
ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_share_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_share_sessions;

-- Indexes
CREATE INDEX idx_screen_share_sessions_code ON public.screen_share_sessions(session_code);
CREATE INDEX idx_screen_share_sessions_status ON public.screen_share_sessions(status);
CREATE INDEX idx_screen_share_signals_session ON public.screen_share_signals(session_id);