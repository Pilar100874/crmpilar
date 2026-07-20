
-- 1. Adicionar colunas em empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS status_comercial text NOT NULL DEFAULT 'cliente_ativo',
  ADD COLUMN IF NOT EXISTS origem_prospeccao text,
  ADD COLUMN IF NOT EXISTS site text;

ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_status_comercial_check;

ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_status_comercial_check
  CHECK (status_comercial IN ('prospect','lead_qualificado','cliente_ativo','cliente_inativo','perdido'));

CREATE INDEX IF NOT EXISTS idx_empresas_status_comercial ON public.empresas(status_comercial);

-- 2. Adicionar empresa_id em prospects_b2b para rastrear conversão
ALTER TABLE public.prospects_b2b
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_b2b_empresa_id ON public.prospects_b2b(empresa_id);

-- 3. Trigger: ao criar orçamento, promover empresa de prospect/lead para cliente_ativo
CREATE OR REPLACE FUNCTION public.promover_empresa_para_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cliente_id IS NOT NULL THEN
    UPDATE public.empresas
       SET status_comercial = 'cliente_ativo',
           updated_at = now()
     WHERE id = NEW.cliente_id
       AND status_comercial IN ('prospect','lead_qualificado');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promover_empresa_para_cliente ON public.orcamentos;
CREATE TRIGGER trg_promover_empresa_para_cliente
  AFTER INSERT ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.promover_empresa_para_cliente();
