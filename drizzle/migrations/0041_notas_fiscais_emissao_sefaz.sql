ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS ref_externa text,
  ADD COLUMN IF NOT EXISTS status_sefaz text,
  ADD COLUMN IF NOT EXISTS mensagem_sefaz text,
  ADD COLUMN IF NOT EXISTS protocolo text,
  ADD COLUMN IF NOT EXISTS ambiente text,
  ADD COLUMN IF NOT EXISTS caminho_xml text,
  ADD COLUMN IF NOT EXISTS caminho_danfe text,
  ADD COLUMN IF NOT EXISTS emitida_em timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS notas_fiscais_ref_externa_unica ON public.notas_fiscais (ref_externa) WHERE ref_externa IS NOT NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS inscricao_estadual text;