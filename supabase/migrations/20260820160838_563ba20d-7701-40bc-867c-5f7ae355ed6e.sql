ALTER TABLE public.tv_playlist_items
  ADD COLUMN IF NOT EXISTS modo_avanco text NOT NULL DEFAULT 'tempo';

ALTER TABLE public.tv_playlist_items
  DROP CONSTRAINT IF EXISTS tv_playlist_items_modo_avanco_check;

ALTER TABLE public.tv_playlist_items
  ADD CONSTRAINT tv_playlist_items_modo_avanco_check
  CHECK (modo_avanco IN ('tempo', 'fim_conteudo'));