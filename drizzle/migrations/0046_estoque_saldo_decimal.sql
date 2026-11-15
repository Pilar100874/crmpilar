ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque_saldo numeric;
UPDATE public.produtos SET estoque_saldo = COALESCE(estoque, 0) WHERE estoque_saldo IS NULL;
ALTER TABLE public.produtos ALTER COLUMN estoque_saldo SET DEFAULT 0;
COMMENT ON COLUMN public.produtos.estoque IS 'DEPRECATED: integer compatibility projection; use estoque_saldo for authoritative stock balance';
COMMENT ON COLUMN public.produtos.estoque_saldo IS 'Authoritative decimal stock balance. Historical movements are not recalculated.';
CREATE OR REPLACE FUNCTION public.produtos_saldo_compatibilidade()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.estoque_saldo, 0) = 0 AND COALESCE(NEW.estoque, 0) <> 0 THEN NEW.estoque_saldo := NEW.estoque; END IF;
  ELSIF NEW.estoque_saldo IS NOT DISTINCT FROM OLD.estoque_saldo AND NEW.estoque IS DISTINCT FROM OLD.estoque THEN
    NEW.estoque_saldo := COALESCE(NEW.estoque, 0);
  END IF;
  NEW.estoque_saldo := COALESCE(NEW.estoque_saldo, 0);
  NEW.estoque := round(NEW.estoque_saldo)::integer;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_produtos_saldo_compatibilidade BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.produtos_saldo_compatibilidade();
REVOKE EXECUTE ON FUNCTION public.produtos_saldo_compatibilidade() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.estoque_aplicar_movimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_saldo numeric;
BEGIN
  SELECT COALESCE(estoque_saldo,0) INTO v_saldo FROM public.produtos WHERE id = NEW.produto_id AND estabelecimento_id = NEW.estabelecimento_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não pertence a esta empresa'; END IF;
  NEW.saldo_anterior := v_saldo;
  NEW.saldo_posterior := v_saldo + CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
  UPDATE public.produtos SET estoque_saldo = NEW.saldo_posterior, updated_at = now() WHERE id = NEW.produto_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.estoque_aplicar_movimento() FROM PUBLIC, anon, authenticated;