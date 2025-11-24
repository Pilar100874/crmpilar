-- Tabela de formulários de avaliação QA
CREATE TABLE IF NOT EXISTS public.qa_formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de critérios de avaliação
CREATE TABLE IF NOT EXISTS public.qa_criterios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.qa_formularios(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  peso INTEGER DEFAULT 1,
  tipo VARCHAR(50) NOT NULL, -- 'boolean', 'escala', 'texto'
  opcoes JSONB, -- Para escalas: {"min": 1, "max": 5, "labels": {...}}
  obrigatorio BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de avaliações QA
CREATE TABLE IF NOT EXISTS public.qa_avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  formulario_id UUID NOT NULL REFERENCES public.qa_formularios(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  atendente_id UUID NOT NULL REFERENCES public.atendentes(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  pontuacao_total DECIMAL(5,2),
  pontuacao_maxima DECIMAL(5,2),
  percentual DECIMAL(5,2),
  observacoes TEXT,
  status VARCHAR(50) DEFAULT 'concluida', -- 'em_andamento', 'concluida', 'revisao'
  data_avaliacao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de respostas dos critérios
CREATE TABLE IF NOT EXISTS public.qa_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES public.qa_avaliacoes(id) ON DELETE CASCADE,
  criterio_id UUID NOT NULL REFERENCES public.qa_criterios(id) ON DELETE CASCADE,
  valor JSONB NOT NULL, -- Valor da resposta (pode ser boolean, number, text)
  pontuacao DECIMAL(5,2),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de metas QA por atendente
CREATE TABLE IF NOT EXISTS public.qa_metas_atendente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  atendente_id UUID NOT NULL REFERENCES public.atendentes(id) ON DELETE CASCADE,
  meta_percentual DECIMAL(5,2) DEFAULT 80.00,
  avaliacoes_minimas_mes INTEGER DEFAULT 10,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_qa_formularios_estabelecimento ON public.qa_formularios(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_qa_criterios_formulario ON public.qa_criterios(formulario_id);
CREATE INDEX IF NOT EXISTS idx_qa_avaliacoes_estabelecimento ON public.qa_avaliacoes(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_qa_avaliacoes_atendente ON public.qa_avaliacoes(atendente_id);
CREATE INDEX IF NOT EXISTS idx_qa_avaliacoes_chat ON public.qa_avaliacoes(chat_id);
CREATE INDEX IF NOT EXISTS idx_qa_avaliacoes_data ON public.qa_avaliacoes(data_avaliacao);
CREATE INDEX IF NOT EXISTS idx_qa_respostas_avaliacao ON public.qa_respostas(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_qa_metas_atendente ON public.qa_metas_atendente(atendente_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_qa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_qa_formularios_updated_at
  BEFORE UPDATE ON public.qa_formularios
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

CREATE TRIGGER trigger_qa_avaliacoes_updated_at
  BEFORE UPDATE ON public.qa_avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

CREATE TRIGGER trigger_qa_metas_updated_at
  BEFORE UPDATE ON public.qa_metas_atendente
  FOR EACH ROW
  EXECUTE FUNCTION update_qa_updated_at();

-- RLS Policies para qa_formularios
ALTER TABLE public.qa_formularios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver formulários do seu estabelecimento"
  ON public.qa_formularios FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem criar formulários"
  ON public.qa_formularios FOR INSERT
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem atualizar formulários"
  ON public.qa_formularios FOR UPDATE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem deletar formulários"
  ON public.qa_formularios FOR DELETE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- RLS Policies para qa_criterios
ALTER TABLE public.qa_criterios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver critérios dos formulários do seu estabelecimento"
  ON public.qa_criterios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_formularios 
      WHERE qa_formularios.id = qa_criterios.formulario_id 
      AND (qa_formularios.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Supervisores e admins podem gerenciar critérios"
  ON public.qa_criterios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_formularios 
      WHERE qa_formularios.id = qa_criterios.formulario_id 
      AND ((qa_formularios.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
            AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
           OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

-- RLS Policies para qa_avaliacoes
ALTER TABLE public.qa_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver avaliações do seu estabelecimento"
  ON public.qa_avaliacoes FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem criar avaliações"
  ON public.qa_avaliacoes FOR INSERT
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem atualizar avaliações"
  ON public.qa_avaliacoes FOR UPDATE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem deletar avaliações"
  ON public.qa_avaliacoes FOR DELETE
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- RLS Policies para qa_respostas
ALTER TABLE public.qa_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver respostas das avaliações do seu estabelecimento"
  ON public.qa_respostas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_avaliacoes 
      WHERE qa_avaliacoes.id = qa_respostas.avaliacao_id 
      AND (qa_avaliacoes.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Supervisores e admins podem gerenciar respostas"
  ON public.qa_respostas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.qa_avaliacoes 
      WHERE qa_avaliacoes.id = qa_respostas.avaliacao_id 
      AND ((qa_avaliacoes.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
            AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
           OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

-- RLS Policies para qa_metas_atendente
ALTER TABLE public.qa_metas_atendente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver metas do seu estabelecimento"
  ON public.qa_metas_atendente FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Supervisores e admins podem gerenciar metas"
  ON public.qa_metas_atendente FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );