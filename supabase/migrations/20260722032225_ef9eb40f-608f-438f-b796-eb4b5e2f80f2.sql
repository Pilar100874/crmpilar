
CREATE TABLE IF NOT EXISTS public.cron_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poller TEXT NOT NULL UNIQUE,
  ultimo_run_em TIMESTAMPTZ,
  ultimo_status TEXT,
  ultimo_detalhes JSONB DEFAULT '{}'::jsonb,
  total_runs INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cron_health TO authenticated;
GRANT ALL ON public.cron_health TO service_role;

ALTER TABLE public.cron_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cron_health"
  ON public.cron_health FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER cron_health_updated_at
  BEFORE UPDATE ON public.cron_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agenda os pollers
SELECT cron.schedule(
  'bot-sla-poller-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/bot-sla-poller',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'marketing-poller-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/marketing-poller',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'ecom-carrinho-poller-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/ecom-carrinho-poller',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'ecom-payment-expiry-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/ecom-payment-expiry-poller',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'pedido-tracking-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/pedido-tracking-poller',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
