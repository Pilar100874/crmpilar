-- Tabela para armazenar macros dos usuários
CREATE TABLE public.user_macros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  shortcut TEXT,
  enabled BOOLEAN DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_user_macros_usuario ON public.user_macros(usuario_id);
CREATE INDEX idx_user_macros_estabelecimento ON public.user_macros(estabelecimento_id);
CREATE INDEX idx_user_macros_shortcut ON public.user_macros(shortcut) WHERE shortcut IS NOT NULL;

-- RLS
ALTER TABLE public.user_macros ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver suas próprias macros
CREATE POLICY "Usuários podem ver suas macros"
ON public.user_macros FOR SELECT
USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Política: usuários podem criar suas macros
CREATE POLICY "Usuários podem criar macros"
ON public.user_macros FOR INSERT
WITH CHECK (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Política: usuários podem atualizar suas macros
CREATE POLICY "Usuários podem atualizar suas macros"
ON public.user_macros FOR UPDATE
USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Política: usuários podem deletar suas macros
CREATE POLICY "Usuários podem deletar macros"
ON public.user_macros FOR DELETE
USING (
  usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);

-- Trigger para updated_at
CREATE TRIGGER update_user_macros_updated_at
BEFORE UPDATE ON public.user_macros
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();