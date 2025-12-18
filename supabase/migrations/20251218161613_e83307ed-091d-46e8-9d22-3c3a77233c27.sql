-- Tabela para configuração de datas padrão de próximo contato por tipo
CREATE TABLE public.atendimento_config_proxima_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  tipo_contato TEXT NOT NULL, -- telefone, whatsapp, email, presencial
  dias_padrao INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(estabelecimento_id, tipo_contato)
);

-- Tabela para flags pré-definidas de atendimento
CREATE TABLE public.atendimento_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para registros de atendimento (o que foi dito em cada tarefa)
CREATE TABLE public.atendimento_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.calendario_tarefas(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  tipo_contato TEXT NOT NULL, -- telefone, whatsapp, email, presencial
  flag_id UUID REFERENCES public.atendimento_flags(id),
  observacao TEXT,
  data_proximo_contato DATE NOT NULL,
  envio_massa BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atendimento_config_proxima_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_registros ENABLE ROW LEVEL SECURITY;

-- Policies for atendimento_config_proxima_data
CREATE POLICY "Users can view config by estabelecimento" ON public.atendimento_config_proxima_data
  FOR SELECT USING (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can manage config by estabelecimento" ON public.atendimento_config_proxima_data
  FOR ALL USING (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

-- Policies for atendimento_flags
CREATE POLICY "Users can view flags by estabelecimento" ON public.atendimento_flags
  FOR SELECT USING (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can manage flags by estabelecimento" ON public.atendimento_flags
  FOR ALL USING (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

-- Policies for atendimento_registros
CREATE POLICY "Users can view registros by estabelecimento" ON public.atendimento_registros
  FOR SELECT USING (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can insert registros" ON public.atendimento_registros
  FOR INSERT WITH CHECK (
    estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

-- Insert default flags
INSERT INTO public.atendimento_flags (estabelecimento_id, nome, cor, ordem)
SELECT e.id, f.nome, f.cor, f.ordem
FROM public.estabelecimentos e
CROSS JOIN (VALUES 
  ('Não atendeu', '#ef4444', 1),
  ('Ocupado', '#f97316', 2),
  ('Agendou visita', '#22c55e', 3),
  ('Solicitou retorno', '#3b82f6', 4),
  ('Sem interesse', '#6b7280', 5),
  ('Fechou negócio', '#10b981', 6),
  ('Caixa postal', '#8b5cf6', 7)
) AS f(nome, cor, ordem);

-- Insert default config for contact types
INSERT INTO public.atendimento_config_proxima_data (estabelecimento_id, tipo_contato, dias_padrao)
SELECT e.id, t.tipo, t.dias
FROM public.estabelecimentos e
CROSS JOIN (VALUES 
  ('telefone', 3),
  ('whatsapp', 2),
  ('email', 5),
  ('presencial', 7)
) AS t(tipo, dias);