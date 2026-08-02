CREATE TABLE public.aip_rotinas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_alvo TEXT NOT NULL DEFAULT 'workflow',
  workflow_id UUID REFERENCES public.aip_workflows(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.aip_agents(id) ON DELETE SET NULL,
  prompt TEXT,
  modelo TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  conectores JSONB NOT NULL DEFAULT '[]'::jsonb,
  cron_expressao TEXT NOT NULL DEFAULT '0 8 * * *',
  fuso TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  timeout_ms INTEGER NOT NULL DEFAULT 120000,
  retry_max INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  proxima_execucao TIMESTAMPTZ,
  ultima_execucao TIMESTAMPTZ,
  ultimo_status TEXT,
  ultimo_erro TEXT,
  ultima_execution_id UUID,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_rotinas TO authenticated;
GRANT ALL ON public.aip_rotinas TO service_role;
ALTER TABLE public.aip_rotinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_rotinas_tenant" ON public.aip_rotinas FOR ALL TO authenticated
  USING ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin())
  WITH CHECK ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin());

CREATE TABLE public.aip_rotina_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  rotina_id UUID NOT NULL REFERENCES public.aip_rotinas(id) ON DELETE CASCADE,
  execution_id UUID,
  status TEXT NOT NULL DEFAULT 'executando',
  origem TEXT NOT NULL DEFAULT 'agendada',
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_em TIMESTAMPTZ,
  duracao_ms INTEGER,
  erro TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_rotina_runs TO authenticated;
GRANT ALL ON public.aip_rotina_runs TO service_role;
ALTER TABLE public.aip_rotina_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_rotina_runs_tenant" ON public.aip_rotina_runs FOR ALL TO authenticated
  USING ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin())
  WITH CHECK ((estabelecimento_id = get_auth_user_estabelecimento_id()) OR is_system_admin());

CREATE INDEX idx_aip_rotinas_proxima ON public.aip_rotinas (ativo, proxima_execucao);
CREATE INDEX idx_aip_rotina_runs_rotina ON public.aip_rotina_runs (rotina_id, iniciado_em DESC);

CREATE TRIGGER trg_aip_rotinas_updated_at BEFORE UPDATE ON public.aip_rotinas
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();
CREATE TRIGGER trg_aip_rotina_runs_updated_at BEFORE UPDATE ON public.aip_rotina_runs
  FOR EACH ROW EXECUTE FUNCTION public.aip_touch_updated_at();