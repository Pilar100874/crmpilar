
-- 1) Preços e totais do e-commerce validados no servidor
CREATE OR REPLACE FUNCTION public.ecom_validar_item_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estab uuid;
  v_tabela numeric;
  v_minimo numeric;
  v_maxvol numeric;
  v_piso numeric;
BEGIN
  IF NEW.quantidade IS NULL OR NEW.quantidade <= 0 THEN
    RAISE EXCEPTION 'Quantidade invalida no item do pedido';
  END IF;
  IF NEW.preco_unitario IS NULL OR NEW.preco_unitario < 0 THEN
    RAISE EXCEPTION 'Preco invalido no item do pedido';
  END IF;

  -- valor do item sempre calculado no servidor
  NEW.subtotal := round(NEW.quantidade * NEW.preco_unitario, 2);

  IF NEW.produto_id IS NOT NULL THEN
    SELECT p.estabelecimento_id, p.preco_tabela, p.preco_minimo
      INTO v_estab, v_tabela, v_minimo
      FROM public.produtos p
     WHERE p.id = NEW.produto_id;

    IF v_tabela IS NOT NULL AND v_tabela > 0 THEN
      SELECT COALESCE(max(vp.percentual_desconto), 0)
        INTO v_maxvol
        FROM public.ecommerce_volume_pricing vp
       WHERE vp.estabelecimento_id = v_estab
         AND vp.ativo = true;

      v_piso := COALESCE(NULLIF(v_minimo, 0),
                         v_tabela * (1 - LEAST(90, COALESCE(v_maxvol, 0) + 20) / 100));

      IF NEW.preco_unitario < v_piso * 0.99 THEN
        RAISE EXCEPTION 'Preco do item abaixo do permitido para o produto';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecom_validar_item_pedido ON public.pedidos_ecommerce_itens;
CREATE TRIGGER trg_ecom_validar_item_pedido
BEFORE INSERT OR UPDATE ON public.pedidos_ecommerce_itens
FOR EACH ROW EXECUTE FUNCTION public.ecom_validar_item_pedido();

CREATE OR REPLACE FUNCTION public.ecom_recalcular_total_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido uuid;
  v_subtotal numeric;
BEGIN
  v_pedido := COALESCE(NEW.pedido_id, OLD.pedido_id);

  SELECT COALESCE(sum(i.subtotal), 0) INTO v_subtotal
    FROM public.pedidos_ecommerce_itens i
   WHERE i.pedido_id = v_pedido;

  UPDATE public.pedidos_ecommerce p
     SET subtotal = v_subtotal,
         desconto = LEAST(GREATEST(COALESCE(p.desconto, 0), 0), v_subtotal),
         valor_total = round(
           v_subtotal
           - LEAST(GREATEST(COALESCE(p.desconto, 0), 0), v_subtotal)
           + GREATEST(COALESCE(p.frete, 0), 0), 2)
   WHERE p.id = v_pedido;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecom_recalcular_total_pedido ON public.pedidos_ecommerce_itens;
CREATE TRIGGER trg_ecom_recalcular_total_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos_ecommerce_itens
FOR EACH ROW EXECUTE FUNCTION public.ecom_recalcular_total_pedido();

-- 2) Canal de denuncias: somente via servidor, com controle de frequencia
CREATE TABLE IF NOT EXISTS public.ecommerce_denuncias_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  origem_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_denuncias_envios_janela
  ON public.ecommerce_denuncias_envios (estabelecimento_id, origem_hash, created_at DESC);

GRANT ALL ON public.ecommerce_denuncias_envios TO service_role;
ALTER TABLE public.ecommerce_denuncias_envios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Envio validado de denuncia" ON public.ecommerce_denuncias;
