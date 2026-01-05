-- Create table for AI API keys
CREATE TABLE public.ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_display_name VARCHAR(100) NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  organization_id VARCHAR(255),
  project_id VARCHAR(255),
  base_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, provider)
);

-- Enable RLS
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their establishment AI keys"
ON public.ai_api_keys
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert AI keys for their establishment"
ON public.ai_api_keys
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their establishment AI keys"
ON public.ai_api_keys
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their establishment AI keys"
ON public.ai_api_keys
FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_api_keys_updated_at
BEFORE UPDATE ON public.ai_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();