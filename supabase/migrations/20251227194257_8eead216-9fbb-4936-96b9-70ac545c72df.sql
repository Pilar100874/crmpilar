-- Create storage bucket for marketing assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload marketing assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-assets' 
  AND auth.role() = 'authenticated'
);

-- Create policy to allow authenticated users to read files
CREATE POLICY "Users can view marketing assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketing-assets');

-- Create policy to allow authenticated users to delete their files
CREATE POLICY "Users can delete marketing assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'marketing-assets' 
  AND auth.role() = 'authenticated'
);