-- Tabela para configuração do catálogo tradicional do WhatsApp
CREATE TABLE public.whatsapp_catalogo_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  phone_number_id TEXT,
  business_account_id TEXT,
  catalog_id TEXT,
  access_token TEXT,
  nome_conta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_catalogo_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their establishment config"
ON public.whatsapp_catalogo_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM usuarios u WHERE u.auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM user_roles ur JOIN usuarios u ON ur.user_id = u.id WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "Users can insert their establishment config"
ON public.whatsapp_catalogo_config
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM usuarios u WHERE u.auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM user_roles ur JOIN usuarios u ON ur.user_id = u.id WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "Users can update their establishment config"
ON public.whatsapp_catalogo_config
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM usuarios u WHERE u.auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM user_roles ur JOIN usuarios u ON ur.user_id = u.id WHERE u.auth_user_id = auth.uid() AND ur.role = 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_catalogo_config_updated_at
BEFORE UPDATE ON public.whatsapp_catalogo_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();