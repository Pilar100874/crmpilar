-- Estado do poller de logística: garante que cada condição só dispara ações 1x por transição
CREATE TABLE IF NOT EXISTS public.logistica_workflow_state (
  chave TEXT PRIMARY KEY, -- ex: "parado:<automacao_id>:<veiculo_id>"
  automacao_id UUID,
  veiculo_id UUID,
  condicao TEXT NOT NULL,
  ativa_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_disparo_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.logistica_workflow_state TO authenticated;
GRANT ALL ON public.logistica_workflow_state TO service_role;
ALTER TABLE public.logistica_workflow_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role gerencia estado logistica" ON public.logistica_workflow_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins veem estado logistica" ON public.logistica_workflow_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Agenda o poller a cada minuto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'logistica-workflow-poller-1min') THEN
    PERFORM cron.schedule(
      'logistica-workflow-poller-1min',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/logistica-workflow-poller',
        headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc"}'::jsonb,
        body := jsonb_build_object('t', now())
      );
      $cron$
    );
  END IF;
END $$;