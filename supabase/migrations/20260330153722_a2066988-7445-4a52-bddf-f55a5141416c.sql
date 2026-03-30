
ALTER TABLE public.ecommerce_config
ADD COLUMN IF NOT EXISTS feat_avaliacoes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_favoritos boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_compartilhar boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_produtos_relacionados boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_b2b_card boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_estoque_visivel boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_newsletter boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_rating_estrelas boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_breadcrumb boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS feat_zoom_imagem boolean DEFAULT true;
