-- Create table for marketing resources
CREATE TABLE public.marketing_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  return_type TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  save_location TEXT,
  n8n_webhook_url TEXT,
  publish_channels TEXT[] DEFAULT '{}',
  auto_publish_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for user access based on estabelecimento
CREATE POLICY "Users can view resources from their estabelecimento" 
ON public.marketing_resources 
FOR SELECT 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create resources for their estabelecimento" 
ON public.marketing_resources 
FOR INSERT 
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update resources from their estabelecimento" 
ON public.marketing_resources 
FOR UPDATE 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete resources from their estabelecimento" 
ON public.marketing_resources 
FOR DELETE 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_resources_updated_at
BEFORE UPDATE ON public.marketing_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();