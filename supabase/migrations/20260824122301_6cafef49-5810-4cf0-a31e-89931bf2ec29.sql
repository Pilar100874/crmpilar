
-- 1) published_pages: remover leitura pública enumerável, expor apenas via slug
DROP POLICY IF EXISTS "Anyone can view published pages" ON public.published_pages;
REVOKE ALL ON public.published_pages FROM anon;

CREATE OR REPLACE FUNCTION public.get_published_page(p_slug text)
RETURNS TABLE(sections jsonb, config jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.sections, p.config
  FROM public.published_pages p
  WHERE p.slug = p_slug AND p.publicado = true
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_published_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_page(text) TO anon, authenticated;

-- 2) ecommerce_denuncias: anon apenas insere
REVOKE ALL ON public.ecommerce_denuncias FROM anon;
GRANT INSERT ON public.ecommerce_denuncias TO anon;

-- 3) pedidos_ecommerce: throttle de inserts anônimos
CREATE OR REPLACE FUNCTION public.pedidos_ecommerce_throttle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent int;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.pedidos_ecommerce p
  WHERE p.estabelecimento_id = NEW.estabelecimento_id
    AND p.created_at > now() - interval '1 minute';

  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'Muitos pedidos em sequencia. Tente novamente em instantes.';
  END IF;

  IF NEW.email_cliente IS NOT NULL OR NEW.telefone_cliente IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.pedidos_ecommerce p
    WHERE p.estabelecimento_id = NEW.estabelecimento_id
      AND p.created_at > now() - interval '1 minute'
      AND (
        (NEW.email_cliente IS NOT NULL AND p.email_cliente = NEW.email_cliente)
        OR (NEW.telefone_cliente IS NOT NULL AND p.telefone_cliente = NEW.telefone_cliente)
      );

    IF v_recent >= 3 THEN
      RAISE EXCEPTION 'Muitos pedidos em sequencia. Tente novamente em instantes.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.pedidos_ecommerce_throttle() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pedidos_ecommerce_throttle ON public.pedidos_ecommerce;
CREATE TRIGGER trg_pedidos_ecommerce_throttle
BEFORE INSERT ON public.pedidos_ecommerce
FOR EACH ROW EXECUTE FUNCTION public.pedidos_ecommerce_throttle();

-- 4) revogar EXECUTE de anon em funcoes SECURITY DEFINER internas
REVOKE EXECUTE ON FUNCTION public.ferr_create_overdue_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_get_user_company_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_is_almoxarifado(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ferr_update_supply_stock() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_estabelecimento_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_estabelecimento_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.op_calculate_task_priority(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.op_get_login_options_by_name(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_has_role(uuid, port_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_is_gestor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.port_is_staff(uuid) FROM anon;
