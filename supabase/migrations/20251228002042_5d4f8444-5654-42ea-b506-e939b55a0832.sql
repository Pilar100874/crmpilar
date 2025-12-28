-- Add flag to indicate if webhook will have a response
ALTER TABLE public.marketing_resources 
ADD COLUMN IF NOT EXISTS webhook_has_response boolean DEFAULT true;