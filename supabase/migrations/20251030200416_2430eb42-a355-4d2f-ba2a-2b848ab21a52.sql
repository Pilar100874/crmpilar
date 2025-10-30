-- Make WhatsApp Business API fields nullable since WAHA doesn't need them
ALTER TABLE public.whatsapp_config 
ALTER COLUMN business_token DROP NOT NULL,
ALTER COLUMN phone_number_id DROP NOT NULL;