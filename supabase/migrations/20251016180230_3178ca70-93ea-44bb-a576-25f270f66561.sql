-- Create table for Twilio configuration
CREATE TABLE IF NOT EXISTS public.twilio_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  account_sid TEXT,
  auth_token TEXT,
  sandbox_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.twilio_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read/write (since it's admin config)
CREATE POLICY "Allow all operations on twilio_config"
  ON public.twilio_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_twilio_config_updated_at
  BEFORE UPDATE ON public.twilio_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();