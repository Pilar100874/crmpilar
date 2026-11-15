CREATE OR REPLACE FUNCTION public.estoque_aplicar_movimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_saldo numeric;
BEGIN
  SELECT COALESCE(estoque,0) INTO v_saldo FROM public.produtos WHERE id = NEW.produto_id AND estabelecimento_id = NEW.estabelecimento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não pertence a esta empresa'; END IF;
  NEW.saldo_anterior := v_saldo;
  NEW.saldo_posterior := v_saldo + CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
  UPDATE public.produtos SET estoque = round(NEW.saldo_posterior)::integer, updated_at = now() WHERE id = NEW.produto_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.estoque_aplicar_movimento() FROM PUBLIC, anon, authenticated;