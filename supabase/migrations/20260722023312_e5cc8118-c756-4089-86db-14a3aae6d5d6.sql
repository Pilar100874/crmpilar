-- Tabela de estado para o poller (última varredura por evento e estabelecimento)
CREATE TABLE IF NOT EXISTS public.tv_workflow_poller_state (
  chave TEXT PRIMARY KEY,
  estabelecimento_id UUID,
  evento TEXT NOT NULL,
  ultimo_check TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_ref TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tv_workflow_poller_state TO authenticated;
GRANT ALL ON public.tv_workflow_poller_state TO service_role;
ALTER TABLE public.tv_workflow_poller_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role gerencia estado do poller" ON public.tv_workflow_poller_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins podem ver estado" ON public.tv_workflow_poller_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Agenda o poller a cada minuto (além do scheduler já existente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tv-workflow-poller-1min') THEN
    PERFORM cron.schedule(
      'tv-workflow-poller-1min',
      '* * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/tv-workflow-poller',
        headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc"}'::jsonb,
        body := jsonb_build_object('t', now())
      );
      $cron$
    );
  END IF;
END $$;