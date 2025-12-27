-- Add steps column to marketing_resources table
ALTER TABLE public.marketing_resources 
ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb;