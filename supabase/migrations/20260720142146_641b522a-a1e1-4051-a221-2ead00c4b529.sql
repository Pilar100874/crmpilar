CREATE OR REPLACE FUNCTION public.promover_empresa_para_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa public.empresas%ROWTYPE;
BEGIN
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_empresa FROM public.empresas WHERE id = NEW.cliente_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_empresa.status_comercial NOT IN ('prospect','lead_qualificado') THEN
    RETURN NEW;
  END IF;

  -- Só promove automaticamente se dados mínimos estiverem completos
  IF COALESCE(NULLIF(TRIM(v_empresa.nome), ''), NULL) IS NOT NULL
     AND COALESCE(NULLIF(TRIM(v_empresa.cnpj), ''), NULL) IS NOT NULL
     AND (
       COALESCE(NULLIF(TRIM(v_empresa.telefone), ''), NULL) IS NOT NULL
       OR COALESCE(NULLIF(TRIM(v_empresa.email), ''), NULL) IS NOT NULL
     )
     AND COALESCE(NULLIF(TRIM(v_empresa.cidade), ''), NULL) IS NOT NULL
     AND COALESCE(NULLIF(TRIM(v_empresa.estado), ''), NULL) IS NOT NULL
  THEN
    UPDATE public.empresas
       SET status_comercial = 'cliente_ativo',
           updated_at = now()
     WHERE id = NEW.cliente_id;
  END IF;

  RETURN NEW;
END;
$function$;