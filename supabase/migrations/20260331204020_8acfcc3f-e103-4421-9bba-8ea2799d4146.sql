ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS feat_webchat boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS feat_whatsapp boolean DEFAULT false;