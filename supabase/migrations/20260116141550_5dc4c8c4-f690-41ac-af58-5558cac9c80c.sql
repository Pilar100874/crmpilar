-- Add active status and validity date columns to catalogos_salvos
ALTER TABLE public.catalogos_salvos 
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS data_validade timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_indeterminada boolean DEFAULT true;

-- Create a function to automatically deactivate expired catalogs
CREATE OR REPLACE FUNCTION public.check_catalog_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.catalogos_salvos
  SET ativo = false
  WHERE data_indeterminada = false
    AND data_validade IS NOT NULL
    AND data_validade <= now()
    AND ativo = true;
END;
$$;

-- Create a trigger function to check expiration on select
CREATE OR REPLACE FUNCTION public.trigger_check_catalog_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_indeterminada = false 
     AND NEW.data_validade IS NOT NULL 
     AND NEW.data_validade <= now() THEN
    NEW.ativo := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to check expiration before update
DROP TRIGGER IF EXISTS check_catalog_expiration_trigger ON public.catalogos_salvos;
CREATE TRIGGER check_catalog_expiration_trigger
  BEFORE UPDATE ON public.catalogos_salvos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_catalog_expiration();