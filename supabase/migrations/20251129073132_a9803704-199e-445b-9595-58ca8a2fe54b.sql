-- Add heigit_api_key column to logistica_config table
ALTER TABLE public.logistica_config 
ADD COLUMN IF NOT EXISTS heigit_api_key text;