-- Tabela para conversas/chats internos entre usuários
CREATE TABLE public.chat_interno_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  titulo TEXT,
  tipo TEXT NOT NULL DEFAULT 'direto' CHECK (tipo IN ('direto', 'grupo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Participantes das conversas
CREATE TABLE public.chat_interno_participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.chat_interno_conversas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  ultima_leitura TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversa_id, usuario_id)
);

-- Mensagens do chat interno
CREATE TABLE public.chat_interno_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.chat_interno_conversas(id) ON DELETE CASCADE,
  remetente_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'arquivo', 'sistema')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Avisos do sistema
CREATE TABLE public.avisos_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'alerta', 'urgente', 'sucesso')),
  destinatarios_tipo TEXT NOT NULL DEFAULT 'todos' CHECK (destinatarios_tipo IN ('todos', 'usuarios_especificos', 'roles')),
  destinatarios_ids UUID[],
  destinatarios_roles TEXT[],
  criado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  expira_em TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leitura dos avisos por usuário
CREATE TABLE public.avisos_lidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aviso_id UUID NOT NULL REFERENCES public.avisos_sistema(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  lido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, usuario_id)
);

-- Enable RLS
ALTER TABLE public.chat_interno_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interno_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_lidos ENABLE ROW LEVEL SECURITY;

-- Policies para chat_interno_conversas
CREATE POLICY "Usuários veem conversas de seu estabelecimento"
ON public.chat_interno_conversas FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários criam conversas em seu estabelecimento"
ON public.chat_interno_conversas FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Policies para chat_interno_participantes
CREATE POLICY "Participantes veem participantes de suas conversas"
ON public.chat_interno_participantes FOR SELECT
USING (
  conversa_id IN (
    SELECT conversa_id FROM public.chat_interno_participantes
    WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Usuários podem adicionar participantes"
ON public.chat_interno_participantes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar sua leitura"
ON public.chat_interno_participantes FOR UPDATE
USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Policies para chat_interno_mensagens
CREATE POLICY "Participantes veem mensagens de suas conversas"
ON public.chat_interno_mensagens FOR SELECT
USING (
  conversa_id IN (
    SELECT conversa_id FROM public.chat_interno_participantes
    WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
);

CREATE POLICY "Participantes enviam mensagens"
ON public.chat_interno_mensagens FOR INSERT
WITH CHECK (
  conversa_id IN (
    SELECT conversa_id FROM public.chat_interno_participantes
    WHERE usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  )
);

-- Policies para avisos_sistema
CREATE POLICY "Usuários veem avisos de seu estabelecimento"
ON public.avisos_sistema FOR SELECT
USING (
  estabelecimento_id IS NULL OR
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins criam avisos"
ON public.avisos_sistema FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam avisos"
ON public.avisos_sistema FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Policies para avisos_lidos
CREATE POLICY "Usuários veem seus avisos lidos"
ON public.avisos_lidos FOR SELECT
USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuários marcam avisos como lidos"
ON public.avisos_lidos FOR INSERT
WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_chat_interno_conversas_estabelecimento ON public.chat_interno_conversas(estabelecimento_id);
CREATE INDEX idx_chat_interno_participantes_conversa ON public.chat_interno_participantes(conversa_id);
CREATE INDEX idx_chat_interno_participantes_usuario ON public.chat_interno_participantes(usuario_id);
CREATE INDEX idx_chat_interno_mensagens_conversa ON public.chat_interno_mensagens(conversa_id);
CREATE INDEX idx_avisos_sistema_estabelecimento ON public.avisos_sistema(estabelecimento_id);
CREATE INDEX idx_avisos_lidos_aviso ON public.avisos_lidos(aviso_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_interno_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos_sistema;

-- Triggers para updated_at
CREATE TRIGGER update_chat_interno_conversas_updated_at
BEFORE UPDATE ON public.chat_interno_conversas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();