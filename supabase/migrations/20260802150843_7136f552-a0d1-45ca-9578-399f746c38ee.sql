CREATE TABLE public.aip_conectores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  tipo text NOT NULL,
  ref text NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text,
  categoria text,
  origem text NOT NULL DEFAULT 'sync',
  status text NOT NULL DEFAULT 'ativo',
  disponivel boolean NOT NULL DEFAULT true,
  ferramentas jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb,
  ultima_sync timestamptz NOT NULL DEFAULT now(),
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, tipo, ref)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_conectores TO authenticated;
GRANT ALL ON public.aip_conectores TO service_role;

ALTER TABLE public.aip_conectores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aip_conectores_tenant" ON public.aip_conectores
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin());

CREATE TRIGGER trg_aip_conectores_upd BEFORE UPDATE ON public.aip_conectores
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE INDEX idx_aip_conectores_estab ON public.aip_conectores (estabelecimento_id, disponivel);