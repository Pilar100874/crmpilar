ALTER TABLE public.automacao_app_chaves
  ADD COLUMN IF NOT EXISTS app text NOT NULL DEFAULT 'automacao';

ALTER TABLE public.automacao_app_chaves
  DROP CONSTRAINT IF EXISTS automacao_app_chaves_app_check;

ALTER TABLE public.automacao_app_chaves
  ADD CONSTRAINT automacao_app_chaves_app_check
  CHECK (app IN ('automacao', 'fone', 'sms', 'remotas'));

CREATE INDEX IF NOT EXISTS idx_automacao_app_chaves_estab_app
  ON public.automacao_app_chaves (estabelecimento_id, app);