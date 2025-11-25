-- Criar tabela para configuração de Cron Jobs
CREATE TABLE IF NOT EXISTS public.cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- 'pesquisa_satisfacao', 'monitorar_sla', etc
  job_name VARCHAR(255) NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL, -- cron expression: '*/5 * * * *' = every 5 minutes
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cron_jobs_estabelecimento ON public.cron_jobs(estabelecimento_id);
CREATE INDEX idx_cron_jobs_type ON public.cron_jobs(job_type);
CREATE INDEX idx_cron_jobs_enabled ON public.cron_jobs(enabled);

-- RLS Policies
ALTER TABLE public.cron_jobs ENABLE ROW LEVEL SECURITY;

-- Admins e gestores podem gerenciar cron jobs
CREATE POLICY "Admins e gestores gerenciam cron jobs"
  ON public.cron_jobs
  FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Usuários podem ver cron jobs do estabelecimento
CREATE POLICY "Usuários veem cron jobs do estabelecimento"
  ON public.cron_jobs
  FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_cron_jobs_updated_at
  BEFORE UPDATE ON public.cron_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();