-- Criar tabela de regras do calendário
CREATE TABLE calendario_regras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL, -- tipo de regra: 'horario_comercial', 'feriados', 'bloqueio_finais_semana', etc
  ativa BOOLEAN NOT NULL DEFAULT true,
  configuracao JSONB DEFAULT '{}'::jsonb, -- configurações específicas da regra
  ordem INTEGER DEFAULT 0, -- ordem de prioridade/exibição
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_calendario_regras_estabelecimento ON calendario_regras(estabelecimento_id);
CREATE INDEX idx_calendario_regras_ativa ON calendario_regras(ativa);

-- RLS Policies
ALTER TABLE calendario_regras ENABLE ROW LEVEL SECURITY;

-- Admins e gestores podem gerenciar as regras
CREATE POLICY "Manage calendario_regras (same estab or admin)"
ON calendario_regras
FOR ALL
USING (
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )) OR 
  (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())) OR
  (NOT roles_present())
)
WITH CHECK (
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )) OR 
  (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())) OR
  (NOT roles_present())
);

-- Todos podem visualizar as regras do seu estabelecimento
CREATE POLICY "View calendario_regras (same estab or admin)"
ON calendario_regras
FOR SELECT
USING (
  (estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )) OR 
  (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- Inserir regras padrão para referência
INSERT INTO calendario_regras (estabelecimento_id, nome, descricao, tipo, ativa, configuracao, ordem) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Horário Comercial', 'Define o horário de funcionamento comercial', 'horario_comercial', false, '{"inicio": "08:00", "fim": "18:00", "dias": [1,2,3,4,5]}'::jsonb, 1),
  ('00000000-0000-0000-0000-000000000000', 'Bloqueio Finais de Semana', 'Bloqueia agendamentos aos sábados e domingos', 'bloqueio_finais_semana', false, '{}'::jsonb, 2),
  ('00000000-0000-0000-0000-000000000000', 'Alerta Tarefas Urgentes', 'Destaca tarefas com menos de 24h', 'alerta_urgente', false, '{"horas": 24}'::jsonb, 3),
  ('00000000-0000-0000-0000-000000000000', 'Confirmação em Finais de Semana', 'Solicita confirmação ao agendar em finais de semana', 'confirmacao_fim_semana', false, '{}'::jsonb, 4);

COMMENT ON TABLE calendario_regras IS 'Regras configuráveis para o calendário de cada estabelecimento';