-- Fix security warning for the function
CREATE OR REPLACE FUNCTION public.set_tarefa_data_original()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_original IS NULL THEN
    NEW.data_original = NEW.date;
  END IF;
  RETURN NEW;
END;
$$;