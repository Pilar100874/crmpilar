-- Sistema de Pesquisas de Satisfação (CSAT/NPS)

-- Tabela para configuração de pesquisas
CREATE TABLE IF NOT EXISTS public.pesquisas_satisfacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('csat', 'nps', 'ces')),
  ativa BOOLEAN NOT NULL DEFAULT true,
  
  -- Configuração de disparo
  trigger_tipo VARCHAR(50) NOT NULL CHECK (trigger_tipo IN ('apos_encerramento', 'apos_tempo', 'manual')),
  trigger_delay_minutos INTEGER DEFAULT 0,
  
  -- Configuração da pesquisa
  pergunta_principal TEXT NOT NULL,
  escala_minima INTEGER NOT NULL DEFAULT 1,
  escala_maxima INTEGER NOT NULL DEFAULT 10,
  label_minima VARCHAR(100),
  label_maxima VARCHAR(100),
  permite_comentario BOOLEAN NOT NULL DEFAULT true,
  pergunta_comentario TEXT,
  
  -- Configuração de canais
  canais TEXT[] NOT NULL DEFAULT ARRAY['whatsapp', 'webchat'],
  
  -- Filtros
  aplica_filas UUID[],
  aplica_atendentes UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para respostas de pesquisas
CREATE TABLE IF NOT EXISTS public.pesquisas_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas_satisfacao(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE SET NULL,
  fila_id UUID REFERENCES public.filas_atendimento(id) ON DELETE SET NULL,
  
  -- Resposta
  nota INTEGER NOT NULL,
  comentario TEXT,
  
  -- Classificação automática (para NPS)
  classificacao VARCHAR(20) CHECK (classificacao IN ('detrator', 'neutro', 'promotor')),
  
  -- Metadados
  canal VARCHAR(50) NOT NULL,
  enviada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  respondida_em TIMESTAMP WITH TIME ZONE,
  tempo_resposta_segundos INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pesquisas_satisfacao_estabelecimento ON public.pesquisas_satisfacao(estabelecimento_id);
CREATE INDEX idx_pesquisas_satisfacao_ativa ON public.pesquisas_satisfacao(ativa) WHERE ativa = true;
CREATE INDEX idx_pesquisas_respostas_pesquisa ON public.pesquisas_respostas(pesquisa_id);
CREATE INDEX idx_pesquisas_respostas_conversation ON public.pesquisas_respostas(conversation_id);
CREATE INDEX idx_pesquisas_respostas_customer ON public.pesquisas_respostas(customer_id);
CREATE INDEX idx_pesquisas_respostas_atendente ON public.pesquisas_respostas(atendente_id);
CREATE INDEX idx_pesquisas_respostas_fila ON public.pesquisas_respostas(fila_id);
CREATE INDEX idx_pesquisas_respostas_respondida ON public.pesquisas_respostas(respondida_em);
CREATE INDEX idx_pesquisas_respostas_classificacao ON public.pesquisas_respostas(classificacao);

-- Trigger para atualização de updated_at
CREATE OR REPLACE FUNCTION update_pesquisas_satisfacao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_pesquisas_satisfacao_updated_at
  BEFORE UPDATE ON public.pesquisas_satisfacao
  FOR EACH ROW
  EXECUTE FUNCTION update_pesquisas_satisfacao_updated_at();

-- Trigger para classificação automática NPS
CREATE OR REPLACE FUNCTION classificar_nps_automatico()
RETURNS TRIGGER AS $$
DECLARE
  tipo_pesquisa VARCHAR(20);
BEGIN
  -- Buscar o tipo da pesquisa
  SELECT tipo INTO tipo_pesquisa
  FROM public.pesquisas_satisfacao
  WHERE id = NEW.pesquisa_id;
  
  -- Classificar apenas se for NPS
  IF tipo_pesquisa = 'nps' THEN
    IF NEW.nota >= 0 AND NEW.nota <= 6 THEN
      NEW.classificacao = 'detrator';
    ELSIF NEW.nota >= 7 AND NEW.nota <= 8 THEN
      NEW.classificacao = 'neutro';
    ELSIF NEW.nota >= 9 AND NEW.nota <= 10 THEN
      NEW.classificacao = 'promotor';
    END IF;
  END IF;
  
  -- Calcular tempo de resposta
  IF NEW.respondida_em IS NOT NULL THEN
    NEW.tempo_resposta_segundos = EXTRACT(EPOCH FROM (NEW.respondida_em - NEW.enviada_em))::INTEGER;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_classificar_nps_automatico
  BEFORE INSERT OR UPDATE ON public.pesquisas_respostas
  FOR EACH ROW
  EXECUTE FUNCTION classificar_nps_automatico();

-- RLS Policies para pesquisas_satisfacao
ALTER TABLE public.pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver pesquisas do seu estabelecimento
CREATE POLICY "Usuários podem ver pesquisas do estabelecimento"
  ON public.pesquisas_satisfacao
  FOR SELECT
  TO authenticated
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Admin ou gestor podem criar pesquisas
CREATE POLICY "Admin/gestor podem criar pesquisas"
  ON public.pesquisas_satisfacao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Admin ou gestor podem atualizar pesquisas
CREATE POLICY "Admin/gestor podem atualizar pesquisas"
  ON public.pesquisas_satisfacao
  FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Admin ou gestor podem deletar pesquisas
CREATE POLICY "Admin/gestor podem deletar pesquisas"
  ON public.pesquisas_satisfacao
  FOR DELETE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- RLS Policies para pesquisas_respostas
ALTER TABLE public.pesquisas_respostas ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver respostas relacionadas ao seu estabelecimento
CREATE POLICY "Usuários podem ver respostas do estabelecimento"
  ON public.pesquisas_respostas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas_satisfacao ps
      WHERE ps.id = pesquisas_respostas.pesquisa_id
      AND (ps.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
    )
  );

-- Sistema pode inserir respostas (via edge function com service_role)
CREATE POLICY "Sistema pode inserir respostas"
  ON public.pesquisas_respostas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sistema pode atualizar respostas (quando cliente responde)
CREATE POLICY "Sistema pode atualizar respostas"
  ON public.pesquisas_respostas
  FOR UPDATE
  TO authenticated
  USING (true);

-- Habilitar realtime para respostas
ALTER PUBLICATION supabase_realtime ADD TABLE public.pesquisas_respostas;