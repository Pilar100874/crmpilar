CREATE TABLE public.automacao_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid REFERENCES public.automacao_ambientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  combinador text NOT NULL DEFAULT 'todas',
  gatilho jsonb NOT NULL DEFAULT '{}'::jsonb,
  condicoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  acoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automacao_regras_ambiente ON public.automacao_regras(ambiente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automacao_regras TO authenticated;
GRANT ALL ON public.automacao_regras TO service_role;
ALTER TABLE public.automacao_regras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam regras de automacao"
ON public.automacao_regras FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_automacao_regras_updated BEFORE UPDATE ON public.automacao_regras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();