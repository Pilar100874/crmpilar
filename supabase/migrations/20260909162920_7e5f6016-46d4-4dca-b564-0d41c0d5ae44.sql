ALTER TABLE public.automacao_ambientes
  ADD COLUMN IF NOT EXISTS tela_largura integer,
  ADD COLUMN IF NOT EXISTS tela_altura integer;