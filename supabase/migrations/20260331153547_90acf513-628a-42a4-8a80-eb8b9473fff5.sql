
CREATE TABLE public.frete_terceiros_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  nome_display VARCHAR(255) NOT NULL,
  api_url TEXT,
  api_key TEXT,
  token TEXT,
  ativo BOOLEAN DEFAULT true,
  configuracao_extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.frete_terceiros_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own frete config"
  ON public.frete_terceiros_config FOR SELECT
  TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Users can insert own frete config"
  ON public.frete_terceiros_config FOR INSERT
  TO authenticated
  WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Users can update own frete config"
  ON public.frete_terceiros_config FOR UPDATE
  TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Users can delete own frete config"
  ON public.frete_terceiros_config FOR DELETE
  TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE TRIGGER update_frete_terceiros_config_updated_at
  BEFORE UPDATE ON public.frete_terceiros_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
