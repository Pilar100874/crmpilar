
-- Add flag to media_gallery to mark items available in chat quick attachments
ALTER TABLE public.media_gallery ADD COLUMN disponivel_chat boolean NOT NULL DEFAULT false;

-- Index for efficient querying
CREATE INDEX idx_media_gallery_disponivel_chat ON public.media_gallery (estabelecimento_id, disponivel_chat) WHERE disponivel_chat = true;
