-- Add column to store original scheduled date
ALTER TABLE public.calendario_tarefas 
ADD COLUMN data_original DATE;

-- Set existing tasks' data_original to their current date
UPDATE public.calendario_tarefas 
SET data_original = date 
WHERE data_original IS NULL;

-- Create trigger to automatically set data_original on insert
CREATE OR REPLACE FUNCTION public.set_tarefa_data_original()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_original IS NULL THEN
    NEW.data_original = NEW.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tarefa_data_original_trigger
BEFORE INSERT ON public.calendario_tarefas
FOR EACH ROW
EXECUTE FUNCTION public.set_tarefa_data_original();