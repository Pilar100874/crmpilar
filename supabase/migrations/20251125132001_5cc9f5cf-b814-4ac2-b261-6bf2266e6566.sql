-- Adicionar coluna supervisor_id na tabela sla_config
ALTER TABLE public.sla_config
ADD COLUMN supervisor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Adicionar índice para performance
CREATE INDEX idx_sla_config_supervisor_id ON public.sla_config(supervisor_id);

-- Comentário
COMMENT ON COLUMN public.sla_config.supervisor_id IS 'ID do usuário que atua como supervisor e receberá notificações de violação de SLA';