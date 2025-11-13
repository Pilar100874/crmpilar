-- Criar tabela para tarefas do calendário
CREATE TABLE IF NOT EXISTS public.calendario_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  contact_id UUID,
  contact_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  type TEXT NOT NULL CHECK (type IN ('accompany', 'call', 'meeting', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_calendario_tarefas_user_id ON public.calendario_tarefas(user_id);
CREATE INDEX idx_calendario_tarefas_estabelecimento_id ON public.calendario_tarefas(estabelecimento_id);
CREATE INDEX idx_calendario_tarefas_date ON public.calendario_tarefas(date);
CREATE INDEX idx_calendario_tarefas_status ON public.calendario_tarefas(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_calendario_tarefas_updated_at
  BEFORE UPDATE ON public.calendario_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.calendario_tarefas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias tarefas"
  ON public.calendario_tarefas
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias tarefas"
  ON public.calendario_tarefas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias tarefas"
  ON public.calendario_tarefas
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias tarefas"
  ON public.calendario_tarefas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Permitir que administradores vejam todas as tarefas
CREATE POLICY "Administradores podem ver todas as tarefas"
  ON public.calendario_tarefas
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  ));

-- Permitir que usuários do mesmo estabelecimento vejam tarefas (para gestores)
CREATE POLICY "Usuários do mesmo estabelecimento podem ver tarefas"
  ON public.calendario_tarefas
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );