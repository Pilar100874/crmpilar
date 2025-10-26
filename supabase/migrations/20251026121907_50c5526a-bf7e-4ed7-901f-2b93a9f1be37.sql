-- Corrige a função update_funil_updated_at com search_path
CREATE OR REPLACE FUNCTION update_funil_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;