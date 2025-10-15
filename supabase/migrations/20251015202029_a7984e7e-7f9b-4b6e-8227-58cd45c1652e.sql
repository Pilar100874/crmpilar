-- Create whatsapp_config table to store WhatsApp Business API credentials
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read config
CREATE POLICY "Allow authenticated users to read whatsapp config"
  ON public.whatsapp_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert config
CREATE POLICY "Allow authenticated users to insert whatsapp config"
  ON public.whatsapp_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update config
CREATE POLICY "Allow authenticated users to update whatsapp config"
  ON public.whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();