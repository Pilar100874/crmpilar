CREATE TABLE IF NOT EXISTS public.bot_frase_uso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  cursor_key TEXT NOT NULL,
  frase_id UUID NOT NULL REFERENCES public.mensagens_grupo_produto(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, cursor_key, frase_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_frase_uso_cursor
  ON public.bot_frase_uso (estabelecimento_id, cursor_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_frase_uso TO authenticated;
GRANT ALL ON public.bot_frase_uso TO service_role;

ALTER TABLE public.bot_frase_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth manage bot_frase_uso"
  ON public.bot_frase_uso FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);