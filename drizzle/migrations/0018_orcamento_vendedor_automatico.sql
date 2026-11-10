CREATE OR REPLACE FUNCTION public.orcamento_definir_vendedor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.vendedor_id IS NULL THEN
    NEW.vendedor_id := public.get_current_usuario_id_safe();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orcamento_definir_vendedor BEFORE INSERT ON public.orcamentos
FOR EACH ROW EXECUTE FUNCTION public.orcamento_definir_vendedor();