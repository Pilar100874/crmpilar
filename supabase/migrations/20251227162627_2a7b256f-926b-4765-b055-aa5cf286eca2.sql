-- Create storage buckets for marketing content
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('marketing-images', 'marketing-images', true),
  ('marketing-videos', 'marketing-videos', true),
  ('marketing-audio', 'marketing-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for marketing-images bucket
CREATE POLICY "Allow authenticated users to upload marketing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-images');

CREATE POLICY "Allow authenticated users to update marketing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-images');

CREATE POLICY "Allow authenticated users to delete marketing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-images');

CREATE POLICY "Allow public read access to marketing images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-images');

-- Create RLS policies for marketing-videos bucket
CREATE POLICY "Allow authenticated users to upload marketing videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-videos');

CREATE POLICY "Allow authenticated users to update marketing videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-videos');

CREATE POLICY "Allow authenticated users to delete marketing videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-videos');

CREATE POLICY "Allow public read access to marketing videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-videos');

-- Create RLS policies for marketing-audio bucket
CREATE POLICY "Allow authenticated users to upload marketing audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-audio');

CREATE POLICY "Allow authenticated users to update marketing audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-audio');

CREATE POLICY "Allow authenticated users to delete marketing audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-audio');

CREATE POLICY "Allow public read access to marketing audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'marketing-audio');

-- Create table to track marketing content created
CREATE TABLE public.marketing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  resource_id UUID,
  resource_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'audio', 'text')),
  content_url TEXT,
  text_content TEXT,
  input_data JSONB,
  channels TEXT[],
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;

-- Create policies using the existing function
CREATE POLICY "Users can view their establishment marketing content"
ON public.marketing_content FOR SELECT
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert marketing content"
ON public.marketing_content FOR INSERT
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update their marketing content"
ON public.marketing_content FOR UPDATE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete their marketing content"
ON public.marketing_content FOR DELETE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());