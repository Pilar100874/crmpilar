-- Create table to store OAuth tokens per user
CREATE TABLE public.email_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.email_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own tokens
CREATE POLICY "Users can view their own tokens" 
ON public.email_oauth_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage tokens" 
ON public.email_oauth_tokens 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_email_oauth_tokens_updated_at
BEFORE UPDATE ON public.email_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();