-- Criar tabela de relatórios customizados
CREATE TABLE IF NOT EXISTS public.relatorios_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_criador_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('atendimento', 'vendas', 'performance', 'satisfacao', 'operacional', 'custom')),
  
  -- Configuração do relatório
  metricas JSONB NOT NULL DEFAULT '[]'::jsonb,
  dimensoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  filtros JSONB DEFAULT '{}'::jsonb,
  
  -- Agendamento
  agendado BOOLEAN DEFAULT false,
  frequencia TEXT CHECK (frequencia IN ('diaria', 'semanal', 'mensal', 'trimestral')),
  dia_execucao INTEGER,
  hora_execucao TIME,
  destinatarios JSONB DEFAULT '[]'::jsonb,
  
  -- Formatação
  formato_exportacao TEXT DEFAULT 'pdf' CHECK (formato_exportacao IN ('pdf', 'excel', 'csv')),
  incluir_graficos BOOLEAN DEFAULT true,
  incluir_tabelas BOOLEAN DEFAULT true,
  
  -- Compartilhamento
  publico BOOLEAN DEFAULT false,
  compartilhado_com JSONB DEFAULT '[]'::jsonb,
  
  ativo BOOLEAN DEFAULT true,
  ultima_execucao TIMESTAMPTZ,
  proxima_execucao TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_relatorios_customizados_estabelecimento ON public.relatorios_customizados(estabelecimento_id);
CREATE INDEX idx_relatorios_customizados_tipo ON public.relatorios_customizados(tipo);
CREATE INDEX idx_relatorios_customizados_criador ON public.relatorios_customizados(usuario_criador_id);
CREATE INDEX idx_relatorios_customizados_agendado ON public.relatorios_customizados(agendado, ativo) WHERE agendado = true AND ativo = true;

-- Criar tabela de execuções de relatórios
CREATE TABLE IF NOT EXISTS public.relatorios_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id UUID NOT NULL REFERENCES public.relatorios_customizados(id) ON DELETE CASCADE,
  
  executado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  executado_em TIMESTAMPTZ DEFAULT now(),
  
  parametros JSONB,
  dados JSONB,
  
  arquivo_url TEXT,
  arquivo_nome TEXT,
  formato TEXT,
  tamanho_bytes BIGINT,
  
  status TEXT DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  erro_mensagem TEXT,
  tempo_execucao_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_relatorios_execucoes_relatorio ON public.relatorios_execucoes(relatorio_id);
CREATE INDEX idx_relatorios_execucoes_executado_por ON public.relatorios_execucoes(executado_por);
CREATE INDEX idx_relatorios_execucoes_data ON public.relatorios_execucoes(executado_em DESC);
CREATE INDEX idx_relatorios_execucoes_status ON public.relatorios_execucoes(status);

-- Criar tabela de métricas agregadas (para performance)
CREATE TABLE IF NOT EXISTS public.metricas_agregadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  
  data DATE NOT NULL,
  periodo_tipo TEXT NOT NULL CHECK (periodo_tipo IN ('dia', 'semana', 'mes', 'trimestre', 'ano')),
  
  fila_id UUID REFERENCES public.filas_atendimento(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE CASCADE,
  canal TEXT,
  
  -- Métricas de Volume
  total_chats INTEGER DEFAULT 0,
  chats_novos INTEGER DEFAULT 0,
  chats_em_atendimento INTEGER DEFAULT 0,
  chats_encerrados INTEGER DEFAULT 0,
  chats_transferidos INTEGER DEFAULT 0,
  chats_reabertos INTEGER DEFAULT 0,
  
  -- Métricas de Tempo (em segundos)
  tempo_medio_primeira_resposta INTEGER,
  tempo_medio_resposta INTEGER,
  tempo_medio_atendimento INTEGER,
  tempo_total_atendimento INTEGER,
  tempo_medio_espera INTEGER,
  
  -- Métricas de SLA
  chats_dentro_sla INTEGER DEFAULT 0,
  chats_fora_sla INTEGER DEFAULT 0,
  taxa_cumprimento_sla DECIMAL(5,2),
  violacoes_primeira_resposta INTEGER DEFAULT 0,
  violacoes_resolucao INTEGER DEFAULT 0,
  
  -- Métricas de Resolução
  chats_resolvidos_primeiro_contato INTEGER DEFAULT 0,
  taxa_fcr DECIMAL(5,2),
  chats_com_followup INTEGER DEFAULT 0,
  
  -- Métricas de Satisfação
  avaliacoes_recebidas INTEGER DEFAULT 0,
  avaliacao_media DECIMAL(3,2),
  nps_score INTEGER,
  nps_promotores INTEGER DEFAULT 0,
  nps_neutros INTEGER DEFAULT 0,
  nps_detratores INTEGER DEFAULT 0,
  
  -- Métricas de Produtividade
  mensagens_enviadas INTEGER DEFAULT 0,
  mensagens_recebidas INTEGER DEFAULT 0,
  chats_simultaneos_medio DECIMAL(4,2),
  chats_simultaneos_pico INTEGER DEFAULT 0,
  
  -- Métricas de Disponibilidade
  tempo_disponivel INTEGER,
  tempo_ocupado INTEGER,
  tempo_pausa INTEGER,
  tempo_offline INTEGER,
  taxa_ocupacao DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice único composto
CREATE UNIQUE INDEX idx_metricas_agregadas_unique 
  ON public.metricas_agregadas(estabelecimento_id, data, periodo_tipo, 
    COALESCE(fila_id::text, ''), COALESCE(atendente_id::text, ''), COALESCE(canal, ''));

CREATE INDEX idx_metricas_agregadas_estabelecimento_data ON public.metricas_agregadas(estabelecimento_id, data DESC);
CREATE INDEX idx_metricas_agregadas_fila ON public.metricas_agregadas(fila_id, data DESC) WHERE fila_id IS NOT NULL;
CREATE INDEX idx_metricas_agregadas_atendente ON public.metricas_agregadas(atendente_id, data DESC) WHERE atendente_id IS NOT NULL;
CREATE INDEX idx_metricas_agregadas_canal ON public.metricas_agregadas(canal, data DESC) WHERE canal IS NOT NULL;
CREATE INDEX idx_metricas_agregadas_periodo ON public.metricas_agregadas(periodo_tipo, data DESC);

-- Criar triggers
CREATE OR REPLACE FUNCTION update_relatorios_customizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_relatorios_customizados_updated_at
  BEFORE UPDATE ON public.relatorios_customizados
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_customizados_updated_at();

CREATE TRIGGER trigger_update_metricas_agregadas_updated_at
  BEFORE UPDATE ON public.metricas_agregadas
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_customizados_updated_at();

-- Habilitar RLS
ALTER TABLE public.relatorios_customizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_agregadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para relatorios_customizados
CREATE POLICY "Usuários podem ver relatórios do estabelecimento"
  ON public.relatorios_customizados FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR publico = true
    OR auth.uid()::text = ANY(
      SELECT jsonb_array_elements_text(compartilhado_com)
    )
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Admins e gestores podem gerenciar relatórios"
  ON public.relatorios_customizados FOR ALL
  USING (
    (
      estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role) 
        OR has_role(auth.uid(), 'gestor'::app_role)
      )
    )
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
    OR NOT roles_present()
  );

-- Políticas RLS para relatorios_execucoes
CREATE POLICY "Usuários podem ver execuções de relatórios acessíveis"
  ON public.relatorios_execucoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relatorios_customizados rc
      WHERE rc.id = relatorios_execucoes.relatorio_id
        AND (
          rc.estabelecimento_id IN (
            SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
          )
          OR rc.publico = true
          OR auth.uid()::text = ANY(
            SELECT jsonb_array_elements_text(rc.compartilhado_com)
          )
          OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
        )
    )
  );

CREATE POLICY "Sistema pode criar execuções"
  ON public.relatorios_execucoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar execuções"
  ON public.relatorios_execucoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.relatorios_customizados rc
      WHERE rc.id = relatorios_execucoes.relatorio_id
        AND (
          (
            rc.estabelecimento_id IN (
              SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
            )
            AND (
              has_role(auth.uid(), 'admin'::app_role) 
              OR has_role(auth.uid(), 'gestor'::app_role)
            )
          )
          OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
          OR NOT roles_present()
        )
    )
  );

-- Políticas RLS para metricas_agregadas
CREATE POLICY "Usuários podem ver métricas do estabelecimento"
  ON public.metricas_agregadas FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode gerenciar métricas"
  ON public.metricas_agregadas FOR ALL
  USING (true)
  WITH CHECK (true);