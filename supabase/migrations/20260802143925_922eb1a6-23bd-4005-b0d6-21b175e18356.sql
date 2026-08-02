
ALTER TABLE public.aip_executions
  ADD COLUMN IF NOT EXISTS workflow_versao integer,
  ADD COLUMN IF NOT EXISTS workflow_version_id uuid REFERENCES public.aip_workflow_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_snapshot jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS aip_workflow_versions_wf_versao_uidx
  ON public.aip_workflow_versions (workflow_id, versao);

CREATE INDEX IF NOT EXISTS aip_executions_workflow_version_idx
  ON public.aip_executions (workflow_id, workflow_versao);

-- Versões são imutáveis
CREATE OR REPLACE FUNCTION public.aip_workflow_versions_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Versões de workflow são imutáveis e não podem ser excluídas';
  END IF;
  IF NEW.flow_data IS DISTINCT FROM OLD.flow_data
     OR NEW.versao IS DISTINCT FROM OLD.versao
     OR NEW.workflow_id IS DISTINCT FROM OLD.workflow_id THEN
    RAISE EXCEPTION 'Versões de workflow são imutáveis';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aip_workflow_versions_imutavel ON public.aip_workflow_versions;
CREATE TRIGGER trg_aip_workflow_versions_imutavel
  BEFORE UPDATE OR DELETE ON public.aip_workflow_versions
  FOR EACH ROW EXECUTE FUNCTION public.aip_workflow_versions_imutavel();

-- Snapshot da execução é imutável depois de gravado
CREATE OR REPLACE FUNCTION public.aip_executions_snapshot_imutavel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.workflow_snapshot IS NOT NULL AND NEW.workflow_snapshot IS DISTINCT FROM OLD.workflow_snapshot THEN
    RAISE EXCEPTION 'O snapshot do workflow da execução é imutável';
  END IF;
  IF OLD.workflow_versao IS NOT NULL AND NEW.workflow_versao IS DISTINCT FROM OLD.workflow_versao THEN
    RAISE EXCEPTION 'A versão do workflow da execução é imutável';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aip_executions_snapshot_imutavel ON public.aip_executions;
CREATE TRIGGER trg_aip_executions_snapshot_imutavel
  BEFORE UPDATE ON public.aip_executions
  FOR EACH ROW EXECUTE FUNCTION public.aip_executions_snapshot_imutavel();

-- Semeia versão inicial para workflows existentes sem histórico
INSERT INTO public.aip_workflow_versions (estabelecimento_id, workflow_id, versao, flow_data, nota, created_by)
SELECT w.estabelecimento_id, w.id, w.versao, w.flow_data, 'Versão inicial (migração)', w.created_by
FROM public.aip_workflows w
WHERE NOT EXISTS (
  SELECT 1 FROM public.aip_workflow_versions v WHERE v.workflow_id = w.id AND v.versao = w.versao
);
