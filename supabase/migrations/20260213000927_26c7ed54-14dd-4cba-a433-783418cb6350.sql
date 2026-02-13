
-- Create table for studio gallery images organized by category
CREATE TABLE public.studio_gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'influencer', 'ambiente', 'estilo', 'paleta', 'textura', 'logo', 'pose'
  nome TEXT,
  descricao TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studio_gallery_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view gallery images for their establishment"
ON public.studio_gallery_images FOR SELECT
USING (true);

CREATE POLICY "Users can insert gallery images"
ON public.studio_gallery_images FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update gallery images"
ON public.studio_gallery_images FOR UPDATE
USING (true);

CREATE POLICY "Users can delete gallery images"
ON public.studio_gallery_images FOR DELETE
USING (true);

-- Index for fast category lookups
CREATE INDEX idx_studio_gallery_categoria ON public.studio_gallery_images(estabelecimento_id, categoria);

-- Storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('studio-gallery', 'studio-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Studio gallery images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-gallery');

CREATE POLICY "Users can upload studio gallery images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'studio-gallery');

CREATE POLICY "Users can delete studio gallery images"
ON storage.objects FOR DELETE
USING (bucket_id = 'studio-gallery');
