-- Tabela para configurar quais ferramentas aparecem em cada aba e no RadialMenu
CREATE TABLE public.ferramentas_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ferramenta_id TEXT NOT NULL, -- identificador único da ferramenta (ex: tool-image, ai-chat)
  nome TEXT NOT NULL, -- nome display da ferramenta
  icone TEXT NOT NULL, -- nome do ícone Lucide
  descricao TEXT, -- descrição da ferramenta
  aba_chat BOOLEAN DEFAULT false, -- aparece na aba chat
  aba_agenda BOOLEAN DEFAULT false, -- aparece na aba agenda
  aba_email BOOLEAN DEFAULT false, -- aparece na aba email
  aba_orcamento BOOLEAN DEFAULT false, -- aparece na aba orçamento
  radial_chat BOOLEAN DEFAULT false, -- aparece no RadialMenu quando na aba chat
  radial_agenda BOOLEAN DEFAULT false, -- aparece no RadialMenu quando na aba agenda
  radial_email BOOLEAN DEFAULT false, -- aparece no RadialMenu quando na aba email
  radial_orcamento BOOLEAN DEFAULT false, -- aparece no RadialMenu quando na aba orçamento
  ordem INTEGER DEFAULT 0, -- ordem de exibição
  ativo BOOLEAN DEFAULT true,
  tipo TEXT DEFAULT 'ferramenta', -- 'ferramenta' ou 'ia'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(estabelecimento_id, ferramenta_id)
);

-- Enable RLS
ALTER TABLE public.ferramentas_atendimento ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários autenticados podem ver ferramentas do estabelecimento"
ON public.ferramentas_atendimento FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = (
      SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'
    )
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins podem gerenciar ferramentas"
ON public.ferramentas_atendimento FOR ALL
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = (
      SELECT id FROM public.usuarios WHERE email = auth.jwt()->>'email'
    )
  )
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger para updated_at
CREATE TRIGGER update_ferramentas_atendimento_updated_at
BEFORE UPDATE ON public.ferramentas_atendimento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir ferramentas padrão (serão criadas quando não existirem no estabelecimento)
COMMENT ON TABLE public.ferramentas_atendimento IS 'Configuração de ferramentas por aba e RadialMenu na tela de atendimento';