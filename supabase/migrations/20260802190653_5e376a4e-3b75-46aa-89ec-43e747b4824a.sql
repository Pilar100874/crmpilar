CREATE TABLE public.aip_receitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'rotina',
  objetivo text,
  detalhes text,
  modelo text,
  skill_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  mcp_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  referencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  md_nome text,
  md_conteudo text,
  modo_execucao text NOT NULL DEFAULT 'unica',
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  agenda jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_id uuid REFERENCES public.aip_agents(id) ON DELETE SET NULL,
  rotina_id uuid REFERENCES public.aip_rotinas(id) ON DELETE SET NULL,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_receitas TO authenticated;
GRANT ALL ON public.aip_receitas TO service_role;

ALTER TABLE public.aip_receitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY aip_receitas_tenant ON public.aip_receitas
  FOR ALL TO authenticated
  USING ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin())
  WITH CHECK ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin());

CREATE TRIGGER trg_aip_receitas_updated_at BEFORE UPDATE ON public.aip_receitas
  FOR EACH ROW EXECUTE FUNCTION aip_touch_updated_at();