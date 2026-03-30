
ALTER TABLE public.ecommerce_config
ADD COLUMN IF NOT EXISTS footer_descricao TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_telefone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_email TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_horario TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_copyright TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_pagamentos TEXT[] DEFAULT ARRAY['Visa','Master','Pix','Boleto'],
ADD COLUMN IF NOT EXISTS footer_links_extras JSONB DEFAULT '[]'::jsonb;
