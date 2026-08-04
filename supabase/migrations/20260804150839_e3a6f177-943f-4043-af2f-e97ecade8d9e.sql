CREATE TABLE IF NOT EXISTS public.logistica_automacao_estado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  chave text NOT NULL,
  valor jsonb NOT NULL DEFAULT '{}'::jsonb,
  expira_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, chave)
);

GRANT SELECT ON public.logistica_automacao_estado TO authenticated;
GRANT ALL ON public.logistica_automacao_estado TO service_role;

ALTER TABLE public.logistica_automacao_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estado visivel para o estabelecimento"
ON public.logistica_automacao_estado
FOR SELECT
TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE TRIGGER trg_logistica_automacao_estado_updated_at
BEFORE UPDATE ON public.logistica_automacao_estado
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_logistica_automacao_estado_chave
ON public.logistica_automacao_estado (estabelecimento_id, chave);