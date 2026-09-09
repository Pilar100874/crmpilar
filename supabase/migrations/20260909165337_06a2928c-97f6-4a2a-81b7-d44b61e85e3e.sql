ALTER TABLE public.automacao_ambientes
  ADD COLUMN IF NOT EXISTS fundo_caminho text,
  ADD COLUMN IF NOT EXISTS fundo_opacidade integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS fundo_ajuste text NOT NULL DEFAULT 'cobrir';