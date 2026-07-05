
CREATE TABLE IF NOT EXISTS public.ponto_notif_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  evento_gatilho TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  flow_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1}}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_notif_workflows TO authenticated;
GRANT ALL ON public.ponto_notif_workflows TO service_role;

ALTER TABLE public.ponto_notif_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth manage ponto_notif_workflows"
ON public.ponto_notif_workflows FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pnw_estab_evento ON public.ponto_notif_workflows(estabelecimento_id, evento_gatilho, ativo);

CREATE OR REPLACE FUNCTION public.pnw_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS pnw_touch ON public.ponto_notif_workflows;
CREATE TRIGGER pnw_touch BEFORE UPDATE ON public.ponto_notif_workflows
FOR EACH ROW EXECUTE FUNCTION public.pnw_touch_updated_at();
