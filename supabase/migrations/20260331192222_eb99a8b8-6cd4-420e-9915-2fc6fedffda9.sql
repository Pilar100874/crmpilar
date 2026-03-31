ALTER TABLE public.ecommerce_config
  ADD COLUMN IF NOT EXISTS topbar_ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS topbar_items jsonb DEFAULT '[
    {"icone":"truck","texto":"Frete grátis acima de R$ 500","posicao":"esquerda"},
    {"icone":"shield","texto":"Compra 100% segura","posicao":"esquerda"},
    {"icone":"rotate-ccw","texto":"Troca facilitada","posicao":"esquerda"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS topbar_telefone text DEFAULT '(11) 4002-8922',
  ADD COLUMN IF NOT EXISTS topbar_link_b2b boolean DEFAULT true;