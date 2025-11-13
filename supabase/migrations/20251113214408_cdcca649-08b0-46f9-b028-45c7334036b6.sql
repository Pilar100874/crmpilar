-- Remover constraint antiga de tipo
ALTER TABLE calendario_tarefas DROP CONSTRAINT IF EXISTS calendario_tarefas_type_check;

-- Renomear coluna type para origem
ALTER TABLE calendario_tarefas RENAME COLUMN type TO origem;

-- Adicionar coluna para vincular campanha (quando origem = 'campanha')
ALTER TABLE calendario_tarefas ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;

-- Atualizar valores existentes para o novo formato
UPDATE calendario_tarefas 
SET origem = CASE 
  WHEN origem = 'call' THEN 'ligacao'
  WHEN origem = 'accompany' THEN 'visita'
  WHEN origem = 'meeting' THEN 'visita'
  WHEN origem = 'other' THEN 'bot'
  ELSE origem
END;

-- Adicionar nova constraint com as opções corretas
ALTER TABLE calendario_tarefas ADD CONSTRAINT calendario_tarefas_origem_check 
CHECK (origem IN ('bot', 'campanha', 'ligacao', 'visita', 'email_enviado', 'email_recebido', 'pedido_orcamento', 'pedido_negociacao', 'pedido_aprovacao'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN calendario_tarefas.origem IS 'Origem da tarefa: bot, campanha, ligacao, visita, email_enviado, email_recebido, pedido_orcamento, pedido_negociacao, pedido_aprovacao';
COMMENT ON COLUMN calendario_tarefas.campaign_id IS 'ID da campanha quando origem = campanha';