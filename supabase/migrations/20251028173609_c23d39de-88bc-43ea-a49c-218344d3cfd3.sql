-- Create customer_empresas junction table for N:N relationship
CREATE TABLE IF NOT EXISTS public.customer_empresas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cargo text,
  departamento text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(customer_id, empresa_id)
);

-- Enable RLS
ALTER TABLE public.customer_empresas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users"
  ON public.customer_empresas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_customer_empresas_customer ON public.customer_empresas(customer_id);
CREATE INDEX idx_customer_empresas_empresa ON public.customer_empresas(empresa_id);