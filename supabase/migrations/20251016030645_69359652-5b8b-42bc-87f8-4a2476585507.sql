-- Create global_variables table
CREATE TABLE IF NOT EXISTS public.global_variables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'array', 'boolean')),
  description TEXT,
  is_constant BOOLEAN DEFAULT FALSE,
  default_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_variables ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read)
CREATE POLICY "Everyone can view global variables"
  ON public.global_variables
  FOR SELECT
  USING (true);

-- Only allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated users can insert global variables"
  ON public.global_variables
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update global variables"
  ON public.global_variables
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete global variables"
  ON public.global_variables
  FOR DELETE
  TO authenticated
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_global_variables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_global_variables_updated_at
  BEFORE UPDATE ON public.global_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_global_variables_updated_at();