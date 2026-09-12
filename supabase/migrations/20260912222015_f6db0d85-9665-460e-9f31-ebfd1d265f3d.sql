ALTER TABLE public.automacao_app_chaves
  ADD COLUMN IF NOT EXISTS app text NOT NULL DEFAULT 'automacao';

CREATE INDEX IF NOT EXISTS idx_automacao_app_chaves_app
  ON public.automacao_app_chaves (app);