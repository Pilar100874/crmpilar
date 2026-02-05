-- Add content_items column to store structured content like in envio em massa
ALTER TABLE public.envio_massa_templates 
ADD COLUMN IF NOT EXISTS content_items jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.envio_massa_templates.content_items IS 'Array of content items: [{id, type, content, mediaUrl, mediaThumbnail, catalogId, catalogName, fileType, quickReplyTitle}]';