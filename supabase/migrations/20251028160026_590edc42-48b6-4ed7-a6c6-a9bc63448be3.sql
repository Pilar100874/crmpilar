-- Create customer_segmentos table to link customers with multiple segments
CREATE TABLE IF NOT EXISTS public.customer_segmentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  segmento_id uuid NOT NULL REFERENCES public.segmentos(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(customer_id, segmento_id)
);

-- Enable RLS
ALTER TABLE public.customer_segmentos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_segmentos
CREATE POLICY "Allow all for authenticated users"
ON public.customer_segmentos
FOR ALL
USING (true)
WITH CHECK (true);