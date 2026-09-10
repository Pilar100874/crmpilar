ALTER TABLE public.automacao_ambientes ADD COLUMN IF NOT EXISTS tela_nome text;

WITH primeiros AS (
  SELECT DISTINCT ON (dispositivo) dispositivo, nome
  FROM public.automacao_ambientes
  ORDER BY dispositivo, ordem, nome
)
UPDATE public.automacao_ambientes a
SET tela_nome = p.nome
FROM primeiros p
WHERE a.dispositivo = p.dispositivo
  AND a.tela_nome IS NULL;