
CREATE TABLE public.ads_scheduler_config (
  estabelecimento_id uuid PRIMARY KEY REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT false,
  frequencia text NOT NULL DEFAULT 'desligado' CHECK (frequencia IN ('desligado','15min','hora','dia','custom')),
  cron_expr text,
  ultima_execucao timestamptz,
  proxima_execucao timestamptz,
  ultimo_status text,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads_scheduler_config TO authenticated;
GRANT ALL ON public.ads_scheduler_config TO service_role;

ALTER TABLE public.ads_scheduler_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam config do próprio estabelecimento"
  ON public.ads_scheduler_config
  FOR ALL
  TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id))
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

CREATE TRIGGER update_ads_scheduler_config_updated_at
  BEFORE UPDATE ON public.ads_scheduler_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
