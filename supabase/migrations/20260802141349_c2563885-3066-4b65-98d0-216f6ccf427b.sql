ALTER TABLE public.aip_executions
  ADD COLUMN IF NOT EXISTS pausado_em timestamptz,
  ADD COLUMN IF NOT EXISTS retomado_em timestamptz,
  ADD COLUMN IF NOT EXISTS retomado_por uuid;

ALTER TABLE public.aip_approvals
  ADD COLUMN IF NOT EXISTS decidido_por_nome text;

CREATE OR REPLACE FUNCTION public.aip_approvals_registrar_decisao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pendente' THEN
    IF NEW.decidido_em IS NULL THEN
      NEW.decidido_em := now();
    END IF;
    IF NEW.decidido_por IS NULL THEN
      NEW.decidido_por := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aip_approvals_decisao ON public.aip_approvals;
CREATE TRIGGER trg_aip_approvals_decisao
BEFORE UPDATE ON public.aip_approvals
FOR EACH ROW EXECUTE FUNCTION public.aip_approvals_registrar_decisao();