-- tv_workflows
CREATE TABLE public.tv_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  evento text NOT NULL,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  mensagem_template text NOT NULL,
  duracao_segundos int NOT NULL DEFAULT 8,
  estilo jsonb NOT NULL DEFAULT '{}'::jsonb,
  escopo_tipo text NOT NULL DEFAULT 'todos',
  escopo_ids uuid[] NOT NULL DEFAULT '{}',
  dashboard_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tv_workflows_estab ON public.tv_workflows(estabelecimento_id);
CREATE INDEX idx_tv_workflows_evento ON public.tv_workflows(evento) WHERE ativo = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_workflows TO authenticated;
GRANT ALL ON public.tv_workflows TO service_role;

ALTER TABLE public.tv_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tv_workflows_select_estab" ON public.tv_workflows
  FOR SELECT TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "tv_workflows_insert_estab" ON public.tv_workflows
  FOR INSERT TO authenticated
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "tv_workflows_update_estab" ON public.tv_workflows
  FOR UPDATE TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id))
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "tv_workflows_delete_estab" ON public.tv_workflows
  FOR DELETE TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE TRIGGER trg_tv_workflows_updated_at
  BEFORE UPDATE ON public.tv_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- tv_workflow_execucoes
CREATE TABLE public.tv_workflow_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.tv_workflows(id) ON DELETE CASCADE,
  device_id uuid NOT NULL,
  estabelecimento_id uuid NOT NULL,
  mensagem_renderizada text NOT NULL,
  estilo jsonb NOT NULL DEFAULT '{}'::jsonb,
  duracao_segundos int NOT NULL DEFAULT 8,
  expira_em timestamptz NOT NULL,
  exibido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tv_wf_exec_device ON public.tv_workflow_execucoes(device_id, created_at DESC);
CREATE INDEX idx_tv_wf_exec_expira ON public.tv_workflow_execucoes(expira_em);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_workflow_execucoes TO authenticated;
GRANT SELECT ON public.tv_workflow_execucoes TO anon;
GRANT ALL ON public.tv_workflow_execucoes TO service_role;

ALTER TABLE public.tv_workflow_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tv_wf_exec_select_estab" ON public.tv_workflow_execucoes
  FOR SELECT TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "tv_wf_exec_select_anon" ON public.tv_workflow_execucoes
  FOR SELECT TO anon USING (true);
CREATE POLICY "tv_wf_exec_insert_estab" ON public.tv_workflow_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_workflow_execucoes;
ALTER TABLE public.tv_workflow_execucoes REPLICA IDENTITY FULL;