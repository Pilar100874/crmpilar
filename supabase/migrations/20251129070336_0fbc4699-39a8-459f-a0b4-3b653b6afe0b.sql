-- Create table for logistics configuration
CREATE TABLE public.logistica_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  token_rastreamento TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.logistica_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their establishment config"
ON public.logistica_config FOR SELECT
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can insert their establishment config"
ON public.logistica_config FOR INSERT
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can update their establishment config"
ON public.logistica_config FOR UPDATE
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_logistica_config_updated_at
  BEFORE UPDATE ON public.logistica_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();