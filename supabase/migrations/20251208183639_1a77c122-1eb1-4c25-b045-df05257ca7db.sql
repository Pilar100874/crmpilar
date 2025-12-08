-- Create table for email OAuth configuration
CREATE TABLE public.email_oauth_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  client_id TEXT,
  client_secret TEXT,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, provider)
);

-- Enable RLS
ALTER TABLE public.email_oauth_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view email oauth config for their establishment"
ON public.email_oauth_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.usuarios u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can insert email oauth config for their establishment"
ON public.email_oauth_config
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.usuarios u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can update email oauth config for their establishment"
ON public.email_oauth_config
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.usuarios u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_email_oauth_config_updated_at
BEFORE UPDATE ON public.email_oauth_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();