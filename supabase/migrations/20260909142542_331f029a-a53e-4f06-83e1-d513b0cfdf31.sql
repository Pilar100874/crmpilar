CREATE TABLE public.automacao_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  icone text,
  ordem integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automacao_ambientes TO authenticated;
GRANT ALL ON public.automacao_ambientes TO service_role;
ALTER TABLE public.automacao_ambientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam ambientes"
ON public.automacao_ambientes FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE public.automacao_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid REFERENCES public.automacao_ambientes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'luz',
  nome text NOT NULL,
  icone text,
  device_id uuid REFERENCES public.port_devices(id) ON DELETE SET NULL,
  canal integer NOT NULL DEFAULT 0,
  x integer NOT NULL DEFAULT 0,
  y integer NOT NULL DEFAULT 0,
  w integer NOT NULL DEFAULT 2,
  h integer NOT NULL DEFAULT 2,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_automacao_blocos_ambiente ON public.automacao_blocos(ambiente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automacao_blocos TO authenticated;
GRANT ALL ON public.automacao_blocos TO service_role;
ALTER TABLE public.automacao_blocos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados gerenciam blocos"
ON public.automacao_blocos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_automacao_ambientes_updated BEFORE UPDATE ON public.automacao_ambientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_automacao_blocos_updated BEFORE UPDATE ON public.automacao_blocos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();