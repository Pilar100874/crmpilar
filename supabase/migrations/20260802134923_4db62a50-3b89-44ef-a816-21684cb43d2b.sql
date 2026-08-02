
-- ============ FUNÇÃO AUXILIAR DE TIMESTAMP ============
CREATE OR REPLACE FUNCTION public.aip_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ AGENTES ============
CREATE TABLE public.aip_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text,
  modelo_ia text NOT NULL DEFAULT 'claude-sonnet-4-5',
  prompt_principal text NOT NULL DEFAULT '',
  skill_ids uuid[] NOT NULL DEFAULT '{}',
  tool_ids uuid[] NOT NULL DEFAULT '{}',
  mcp_ids uuid[] NOT NULL DEFAULT '{}',
  limite_custo numeric,
  limite_tempo_seg integer,
  tags text[] NOT NULL DEFAULT '{}',
  versao integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_agents TO authenticated;
GRANT ALL ON public.aip_agents TO service_role;
ALTER TABLE public.aip_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_agents_tenant" ON public.aip_agents FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_agents_upd BEFORE UPDATE ON public.aip_agents FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.aip_agents(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  nota text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_agent_versions TO authenticated;
GRANT ALL ON public.aip_agent_versions TO service_role;
ALTER TABLE public.aip_agent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_agent_versions_tenant" ON public.aip_agent_versions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- ============ SKILLS ============
CREATE TABLE public.aip_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  slug text,
  categoria text,
  descricao text,
  conteudo_md text NOT NULL DEFAULT '',
  versao integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho',
  tags text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_skills TO authenticated;
GRANT ALL ON public.aip_skills TO service_role;
ALTER TABLE public.aip_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_skills_tenant" ON public.aip_skills FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_skills_upd BEFORE UPDATE ON public.aip_skills FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_skill_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.aip_skills(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  conteudo_md text NOT NULL DEFAULT '',
  nota text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_skill_versions TO authenticated;
GRANT ALL ON public.aip_skill_versions TO service_role;
ALTER TABLE public.aip_skill_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_skill_versions_tenant" ON public.aip_skill_versions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

CREATE TABLE public.aip_skill_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.aip_skills(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_skill_files TO authenticated;
GRANT ALL ON public.aip_skill_files TO service_role;
ALTER TABLE public.aip_skill_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_skill_files_tenant" ON public.aip_skill_files FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- ============ TOOLS ============
CREATE TABLE public.aip_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'api',
  descricao text,
  tipo text NOT NULL DEFAULT 'http',
  endpoint text,
  metodo text NOT NULL DEFAULT 'POST',
  input_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  permissoes text[] NOT NULL DEFAULT '{}',
  credencial_ref text,
  timeout_seg integer NOT NULL DEFAULT 60,
  retry integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_tools TO authenticated;
GRANT ALL ON public.aip_tools TO service_role;
ALTER TABLE public.aip_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_tools_tenant" ON public.aip_tools FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_tools_upd BEFORE UPDATE ON public.aip_tools FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- ============ MCPs ============
CREATE TABLE public.aip_mcps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  endpoint text NOT NULL,
  tipo text NOT NULL DEFAULT 'http',
  descricao text,
  status text NOT NULL DEFAULT 'desconectado',
  ferramentas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ambiente text NOT NULL DEFAULT 'producao',
  credencial_ref text,
  ultimo_handshake timestamptz,
  ultimo_erro text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_mcps TO authenticated;
GRANT ALL ON public.aip_mcps TO service_role;
ALTER TABLE public.aip_mcps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_mcps_tenant" ON public.aip_mcps FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_mcps_upd BEFORE UPDATE ON public.aip_mcps FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- ============ CATÁLOGO DE RECURSOS ============
CREATE TABLE public.aip_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid,
  categoria text NOT NULL,
  subcategoria text,
  nome text NOT NULL,
  slug text NOT NULL,
  descricao text,
  icone text,
  config_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_resources TO authenticated;
GRANT ALL ON public.aip_resources TO service_role;
ALTER TABLE public.aip_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_resources_read" ON public.aip_resources FOR SELECT TO authenticated
USING (is_padrao OR estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY "aip_resources_write" ON public.aip_resources FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY "aip_resources_update" ON public.aip_resources FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY "aip_resources_delete" ON public.aip_resources FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_resources_upd BEFORE UPDATE ON public.aip_resources FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- ============ WORKFLOWS ============
CREATE TABLE public.aip_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text,
  flow_data jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  versao integer NOT NULL DEFAULT 1,
  tags text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_workflows TO authenticated;
GRANT ALL ON public.aip_workflows TO service_role;
ALTER TABLE public.aip_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_workflows_tenant" ON public.aip_workflows FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_workflows_upd BEFORE UPDATE ON public.aip_workflows FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  workflow_id uuid NOT NULL REFERENCES public.aip_workflows(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  flow_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  nota text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_workflow_versions TO authenticated;
GRANT ALL ON public.aip_workflow_versions TO service_role;
ALTER TABLE public.aip_workflow_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_workflow_versions_tenant" ON public.aip_workflow_versions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- ============ WIZARDS ============
CREATE TABLE public.aip_wizards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  icone text,
  etapas jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow_id uuid REFERENCES public.aip_workflows(id) ON DELETE SET NULL,
  entrega jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_wizards TO authenticated;
GRANT ALL ON public.aip_wizards TO service_role;
ALTER TABLE public.aip_wizards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_wizards_tenant" ON public.aip_wizards FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_wizards_upd BEFORE UPDATE ON public.aip_wizards FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- ============ EXECUÇÕES ============
CREATE TABLE public.aip_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  workflow_id uuid REFERENCES public.aip_workflows(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.aip_agents(id) ON DELETE SET NULL,
  wizard_id uuid REFERENCES public.aip_wizards(id) ON DELETE SET NULL,
  origem text NOT NULL DEFAULT 'workflow',
  usuario_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  etapa_atual text,
  modelo text,
  prompt text,
  resposta text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  custo numeric NOT NULL DEFAULT 0,
  duracao_ms integer,
  erro text,
  remote_run_id text,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_executions TO authenticated;
GRANT ALL ON public.aip_executions TO service_role;
ALTER TABLE public.aip_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_executions_tenant" ON public.aip_executions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_executions_upd BEFORE UPDATE ON public.aip_executions FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();
CREATE INDEX idx_aip_executions_estab_data ON public.aip_executions(estabelecimento_id, created_at DESC);

CREATE TABLE public.aip_execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  execution_id uuid NOT NULL REFERENCES public.aip_executions(id) ON DELETE CASCADE,
  node_id text,
  tipo text,
  titulo text,
  status text NOT NULL DEFAULT 'pendente',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  logs text,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  custo numeric NOT NULL DEFAULT 0,
  duracao_ms integer,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_execution_steps TO authenticated;
GRANT ALL ON public.aip_execution_steps TO service_role;
ALTER TABLE public.aip_execution_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_execution_steps_tenant" ON public.aip_execution_steps FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- ============ APROVAÇÕES ============
CREATE TABLE public.aip_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  execution_id uuid NOT NULL REFERENCES public.aip_executions(id) ON DELETE CASCADE,
  node_id text,
  titulo text NOT NULL DEFAULT 'Aprovação necessária',
  instrucoes text,
  tipo text NOT NULL DEFAULT 'texto',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  selecionados jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  comentario text,
  decidido_por uuid,
  decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_approvals TO authenticated;
GRANT ALL ON public.aip_approvals TO service_role;
ALTER TABLE public.aip_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_approvals_tenant" ON public.aip_approvals FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_approvals_upd BEFORE UPDATE ON public.aip_approvals FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

-- ============ ASSETS ============
CREATE TABLE public.aip_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'imagem',
  mime_type text,
  url text,
  storage_path text,
  tamanho_bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution_id uuid REFERENCES public.aip_executions(id) ON DELETE SET NULL,
  workflow_id uuid REFERENCES public.aip_workflows(id) ON DELETE SET NULL,
  versao integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_assets TO authenticated;
GRANT ALL ON public.aip_assets TO service_role;
ALTER TABLE public.aip_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_assets_tenant" ON public.aip_assets FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_assets_upd BEFORE UPDATE ON public.aip_assets FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_asset_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.aip_assets(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  url text,
  storage_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_asset_versions TO authenticated;
GRANT ALL ON public.aip_asset_versions TO service_role;
ALTER TABLE public.aip_asset_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_asset_versions_tenant" ON public.aip_asset_versions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());

-- ============ SEGURANÇA ============
CREATE TABLE public.aip_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  prefixo text NOT NULL,
  hash text NOT NULL,
  escopos text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  expira_em timestamptz,
  ultimo_uso timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_api_keys TO authenticated;
GRANT ALL ON public.aip_api_keys TO service_role;
ALTER TABLE public.aip_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_api_keys_tenant" ON public.aip_api_keys FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_api_keys_upd BEFORE UPDATE ON public.aip_api_keys FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  escopo text NOT NULL DEFAULT 'estabelecimento',
  referencia_id uuid,
  custo_max_dia numeric,
  execucoes_max_dia integer,
  tokens_max_dia bigint,
  bloquear_ao_exceder boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_usage_limits TO authenticated;
GRANT ALL ON public.aip_usage_limits TO service_role;
ALTER TABLE public.aip_usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_usage_limits_tenant" ON public.aip_usage_limits FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_usage_limits_upd BEFORE UPDATE ON public.aip_usage_limits FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid,
  perfil text,
  recurso_tipo text NOT NULL,
  recurso_id uuid,
  acoes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_permissions TO authenticated;
GRANT ALL ON public.aip_permissions TO service_role;
ALTER TABLE public.aip_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_permissions_tenant" ON public.aip_permissions FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE TRIGGER trg_aip_permissions_upd BEFORE UPDATE ON public.aip_permissions FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();

CREATE TABLE public.aip_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid,
  acao text NOT NULL,
  recurso_tipo text,
  recurso_id uuid,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.aip_audit_log TO authenticated;
GRANT ALL ON public.aip_audit_log TO service_role;
ALTER TABLE public.aip_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_audit_read" ON public.aip_audit_log FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY "aip_audit_insert" ON public.aip_audit_log FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
