
CREATE TABLE public.marketing_automation_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  error_message TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_auto_logs_automation ON public.marketing_automation_execution_logs(automation_id, executed_at DESC);
CREATE INDEX idx_marketing_auto_logs_estab ON public.marketing_automation_execution_logs(estabelecimento_id, executed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_automation_execution_logs TO authenticated;
GRANT ALL ON public.marketing_automation_execution_logs TO service_role;

ALTER TABLE public.marketing_automation_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view logs of own estabelecimento"
ON public.marketing_automation_execution_logs
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role manages logs"
ON public.marketing_automation_execution_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
