-- Create storage bucket for catalog AI images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalog-ai-images', 'catalog-ai-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public read access
CREATE POLICY "Catalog AI images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'catalog-ai-images');

-- Policy for authenticated users to upload
CREATE POLICY "Users can upload catalog AI images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'catalog-ai-images');

-- Policy for users to delete their own images
CREATE POLICY "Users can delete catalog AI images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'catalog-ai-images');

-- Table to track generated images with metadata
CREATE TABLE public.catalog_ai_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalog_ai_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their catalog AI images" 
ON public.catalog_ai_images 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert catalog AI images" 
ON public.catalog_ai_images 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete catalog AI images" 
ON public.catalog_ai_images 
FOR DELETE 
USING (true);