ALTER TABLE public.livro_ocorrencias
  ADD COLUMN IF NOT EXISTS resolvido_por text,
  ADD COLUMN IF NOT EXISTS resolvido_em timestamptz,
  ADD COLUMN IF NOT EXISTS observacao_resolucao text;