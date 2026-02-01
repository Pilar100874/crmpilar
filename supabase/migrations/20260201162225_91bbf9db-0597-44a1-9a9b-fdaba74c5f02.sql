-- Tabela para rastrear atividade/presença dos usuários em tempo real
CREATE TABLE public.user_activity_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  current_route TEXT,
  current_page_title TEXT,
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_active_time_seconds INTEGER DEFAULT 0,
  is_online BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, estabelecimento_id)
);

-- Habilitar RLS
ALTER TABLE public.user_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas atividades do seu estabelecimento
CREATE POLICY "Usuarios podem ver atividades do estabelecimento"
ON public.user_activity_tracking
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

-- Política para usuários atualizarem sua própria atividade
CREATE POLICY "Usuarios podem atualizar propria atividade"
ON public.user_activity_tracking
FOR ALL
USING (usuario_id = auth.uid());

-- Índices para performance
CREATE INDEX idx_user_activity_estabelecimento ON public.user_activity_tracking(estabelecimento_id);
CREATE INDEX idx_user_activity_usuario ON public.user_activity_tracking(usuario_id);
CREATE INDEX idx_user_activity_online ON public.user_activity_tracking(is_online);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_tracking;