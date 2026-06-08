CREATE TABLE public.flow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_templates TO authenticated;
GRANT ALL ON public.flow_templates TO service_role;

ALTER TABLE public.flow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem modelos do proprio estabelecimento"
ON public.flow_templates FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuarios criam modelos no proprio estabelecimento"
ON public.flow_templates FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuarios atualizam modelos do proprio estabelecimento"
ON public.flow_templates FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuarios excluem modelos do proprio estabelecimento"
ON public.flow_templates FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE INDEX idx_flow_templates_estab ON public.flow_templates(estabelecimento_id, created_at DESC);

CREATE TRIGGER trg_flow_templates_updated_at
BEFORE UPDATE ON public.flow_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();