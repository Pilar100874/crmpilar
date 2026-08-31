CREATE OR REPLACE FUNCTION public.set_unidade_atual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unidade_id IS NULL THEN
    NEW.unidade_id := public.get_minha_unidade_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'port_people','port_visitors','port_access_points','port_devices',
    'transp_movimentos','transp_veiculos','transp_motoristas','transp_setores',
    'livro_ocorrencias','livro_encomendas',
    'cv_vehicles','cv_vehicle_movements','cv_drivers','cv_helpers'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_unidade_atual ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_unidade_atual BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_unidade_atual()', t);
  END LOOP;
END $$;