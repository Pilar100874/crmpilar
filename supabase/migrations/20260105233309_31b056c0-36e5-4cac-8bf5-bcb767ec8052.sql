-- Create telegram_config table
CREATE TABLE public.telegram_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  bot_token TEXT,
  bot_username TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view telegram config for their establishment" 
ON public.telegram_config 
FOR SELECT 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert telegram config for their establishment" 
ON public.telegram_config 
FOR INSERT 
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update telegram config for their establishment" 
ON public.telegram_config 
FOR UPDATE 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete telegram config for their establishment" 
ON public.telegram_config 
FOR DELETE 
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_telegram_config_updated_at
  BEFORE UPDATE ON public.telegram_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();