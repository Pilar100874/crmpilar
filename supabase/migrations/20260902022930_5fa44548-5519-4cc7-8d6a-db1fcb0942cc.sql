
-- 1) Harden public token lookup (missing token guard)
CREATE OR REPLACE FUNCTION public.lookup_pedido_by_token(p_token text)
RETURNS SETOF public.pedido_tracking
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.pedido_tracking
  WHERE p_token IS NOT NULL
    AND length(p_token) >= 8
    AND token_rastreamento = p_token
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_published_page(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_pedido_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_orcamento_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_itens_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_pedido_historico_by_token(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_pedidos_ecommerce_by_tokens(text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_published_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_orcamento_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_itens_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_historico_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_pedidos_ecommerce_by_tokens(text[]) TO anon, authenticated;

-- 2) Abuse throttle for anonymous denuncias
CREATE OR REPLACE FUNCTION public.limitar_denuncias_abuso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.ecommerce_denuncias d
  WHERE d.estabelecimento_id = NEW.estabelecimento_id
    AND d.created_at > now() - interval '10 minutes';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Limite de envios atingido. Tente novamente em alguns minutos.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limitar_denuncias_abuso ON public.ecommerce_denuncias;
CREATE TRIGGER trg_limitar_denuncias_abuso
BEFORE INSERT ON public.ecommerce_denuncias
FOR EACH ROW EXECUTE FUNCTION public.limitar_denuncias_abuso();

-- 3) Rate limit anonymous e-commerce order creation
CREATE OR REPLACE FUNCTION public.limitar_pedidos_ecommerce_abuso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.pedidos_ecommerce p
  WHERE p.estabelecimento_id = NEW.estabelecimento_id
    AND p.created_at > now() - interval '1 minute';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Muitos pedidos criados em sequencia. Aguarde um instante e tente novamente.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_limitar_pedidos_ecommerce_abuso ON public.pedidos_ecommerce;
CREATE TRIGGER trg_limitar_pedidos_ecommerce_abuso
BEFORE INSERT ON public.pedidos_ecommerce
FOR EACH ROW EXECUTE FUNCTION public.limitar_pedidos_ecommerce_abuso();

-- 4) Restrict cross-establishment item insertion window to anonymous checkout only
DROP POLICY IF EXISTS "Itens validados de pedido" ON public.pedidos_ecommerce_itens;
CREATE POLICY "Itens validados de pedido"
ON public.pedidos_ecommerce_itens
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos_ecommerce p
    WHERE p.id = pedidos_ecommerce_itens.pedido_id
      AND (
        p.estabelecimento_id = get_auth_user_estabelecimento_id()
        OR (
          auth.uid() IS NULL
          AND p.created_at > (now() - interval '5 minutes')
          AND p.status = 'pendente'
          AND (
            (SELECT COALESCE(sum(i.subtotal), 0) FROM public.pedidos_ecommerce_itens i WHERE i.pedido_id = p.id)
            + pedidos_ecommerce_itens.subtotal
          ) <= COALESCE(p.valor_total, 0)
        )
      )
  )
  AND quantidade > 0
  AND quantidade <= 100000
  AND preco_unitario >= 0
  AND subtotal >= 0
  AND char_length(COALESCE(nome_produto, '')) <= 300
);
