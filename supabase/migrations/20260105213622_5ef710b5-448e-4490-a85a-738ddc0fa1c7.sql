-- Create table for integration credentials (Google, MS SQL, etc.)
CREATE TABLE public.integration_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- 'google', 'mssql', 'ftp', etc.
  integration_name TEXT NOT NULL, -- 'gmail', 'drive', 'sheets', 'docs', 'mssql', etc.
  display_name TEXT NOT NULL,
  credentials_json JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  validation_status TEXT DEFAULT 'pending',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies using auth_user_id
CREATE POLICY "Users can view their establishment integration credentials" 
ON public.integration_credentials 
FOR SELECT 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert integration credentials for their establishment" 
ON public.integration_credentials 
FOR INSERT 
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their establishment integration credentials" 
ON public.integration_credentials 
FOR UPDATE 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can delete their establishment integration credentials" 
ON public.integration_credentials 
FOR DELETE 
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_integration_credentials_updated_at
BEFORE UPDATE ON public.integration_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_integration_credentials_estabelecimento ON public.integration_credentials(estabelecimento_id);
CREATE INDEX idx_integration_credentials_type ON public.integration_credentials(integration_type);