-- Create administrators table
CREATE TABLE public.administradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view administradores"
  ON public.administradores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage administradores"
  ON public.administradores
  FOR ALL
  USING (
    (auth.uid() IS NOT NULL) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor') OR NOT roles_present())
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor') OR NOT roles_present())
  );

-- Trigger for updated_at
CREATE TRIGGER update_administradores_updated_at
  BEFORE UPDATE ON public.administradores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();