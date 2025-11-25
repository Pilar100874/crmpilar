-- Adicionar campos de ações automáticas à tabela sla_config
ALTER TABLE public.sla_config 
ADD COLUMN IF NOT EXISTS notificar_supervisor boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS aumentar_prioridade_automatica boolean DEFAULT false;

COMMENT ON COLUMN public.sla_config.notificar_supervisor IS 'Se true, supervisores serão notificados quando o SLA atingir o limite de alerta';
COMMENT ON COLUMN public.sla_config.aumentar_prioridade_automatica IS 'Se true, a prioridade do chat aumenta automaticamente quando o SLA for violado';