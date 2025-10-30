-- Create marketing_automations table
CREATE TABLE IF NOT EXISTS public.marketing_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

-- Create policies (corrigido: usando 'id' ao invés de 'user_id')
CREATE POLICY "Users can view marketing automations from their establishment"
ON public.marketing_automations
FOR SELECT
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
));

CREATE POLICY "Users can create marketing automations for their establishment"
ON public.marketing_automations
FOR INSERT
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
));

CREATE POLICY "Users can update marketing automations from their establishment"
ON public.marketing_automations
FOR UPDATE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
));

CREATE POLICY "Users can delete marketing automations from their establishment"
ON public.marketing_automations
FOR DELETE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_automations_updated_at
BEFORE UPDATE ON public.marketing_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_marketing_automations_estabelecimento ON public.marketing_automations(estabelecimento_id);
CREATE INDEX idx_marketing_automations_active ON public.marketing_automations(active);