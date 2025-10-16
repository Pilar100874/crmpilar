-- Criar bucket para uploads de mídia do bot
INSERT INTO storage.buckets (id, name, public)
VALUES ('bot-media', 'bot-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket bot-media
CREATE POLICY "Permitir upload público de mídia do bot"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'bot-media');

CREATE POLICY "Permitir leitura pública de mídia do bot"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'bot-media');

CREATE POLICY "Permitir atualização de mídia do bot"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'bot-media')
WITH CHECK (bucket_id = 'bot-media');

CREATE POLICY "Permitir exclusão de mídia do bot"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'bot-media');