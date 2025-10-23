-- Create webhook_chat_sessions table to isolate user test conversations
CREATE TABLE public.webhook_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  estabelecimento_id UUID NOT NULL,
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('webhook', 'ai')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_chat_messages table to store messages per session
CREATE TABLE public.webhook_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.webhook_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'audio', 'image', 'file', 'variable')),
  file_url TEXT,
  file_name TEXT,
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_chat_sessions
CREATE POLICY "Users can view their own webhook sessions"
ON public.webhook_chat_sessions FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own webhook sessions"
ON public.webhook_chat_sessions FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own webhook sessions"
ON public.webhook_chat_sessions FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own webhook sessions"
ON public.webhook_chat_sessions FOR DELETE
USING (auth.uid()::text = user_id::text);

-- RLS policies for webhook_chat_messages (via session ownership)
CREATE POLICY "Users can view messages from their webhook sessions"
ON public.webhook_chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.webhook_chat_sessions
    WHERE webhook_chat_sessions.id = webhook_chat_messages.session_id
    AND webhook_chat_sessions.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can create messages in their webhook sessions"
ON public.webhook_chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.webhook_chat_sessions
    WHERE webhook_chat_sessions.id = webhook_chat_messages.session_id
    AND webhook_chat_sessions.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can delete messages from their webhook sessions"
ON public.webhook_chat_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.webhook_chat_sessions
    WHERE webhook_chat_sessions.id = webhook_chat_messages.session_id
    AND webhook_chat_sessions.user_id::text = auth.uid()::text
  )
);

-- Indexes for better performance
CREATE INDEX idx_webhook_chat_sessions_user ON public.webhook_chat_sessions(user_id);
CREATE INDEX idx_webhook_chat_sessions_estab ON public.webhook_chat_sessions(estabelecimento_id);
CREATE INDEX idx_webhook_chat_messages_session ON public.webhook_chat_messages(session_id);
CREATE INDEX idx_webhook_chat_messages_created ON public.webhook_chat_messages(created_at);

-- Trigger for updated_at on webhook_chat_sessions
CREATE TRIGGER update_webhook_chat_sessions_updated_at
BEFORE UPDATE ON public.webhook_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for webhook_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_chat_messages;