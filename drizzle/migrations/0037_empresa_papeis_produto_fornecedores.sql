ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS eh_cliente boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eh_fornecedor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_vendedor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eh_transportadora boolean NOT NULL DEFAULT false;

UPDATE public.empresas SET
  eh_vendedor = (tipo_cliente = 'vendedor'),
  eh_transportadora = (tipo_cliente = 'transportadora'),
  eh_cliente = (tipo_cliente NOT IN ('vendedor','transportadora'));

CREATE OR REPLACE FUNCTION public.empresas_sincronizar_papeis()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo_cliente = 'vendedor' THEN NEW.eh_vendedor := true; END IF;
  IF NEW.tipo_cliente = 'transportadora' THEN NEW.eh_transportadora := true; END IF;
  IF TG_OP = 'INSERT' AND NEW.tipo_cliente IN ('vendedor','transportadora') AND NOT NEW.eh_fornecedor THEN
    NEW.eh_cliente := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_empresas_sincronizar_papeis ON public.empresas;
CREATE TRIGGER trg_empresas_sincronizar_papeis BEFORE INSERT OR UPDATE OF tipo_cliente ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.empresas_sincronizar_papeis();

CREATE TABLE public.produto_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  nome_comercial text,
  sku_fornecedor text,
  unidade_compra text,
  fator_conversao numeric NOT NULL DEFAULT 1,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, empresa_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internos gerenciam fornecedores do produto" ON public.produto_fornecedores
FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());