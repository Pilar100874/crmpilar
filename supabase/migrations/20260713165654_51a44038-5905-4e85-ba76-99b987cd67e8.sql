
CREATE TABLE public.usuario_telas_customizadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tela_id UUID NOT NULL REFERENCES public.telas_customizadas(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, tela_id)
);
CREATE INDEX idx_utc_usuario ON public.usuario_telas_customizadas(usuario_id);
CREATE INDEX idx_utc_tela ON public.usuario_telas_customizadas(tela_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_telas_customizadas TO authenticated;
GRANT ALL ON public.usuario_telas_customizadas TO service_role;

ALTER TABLE public.usuario_telas_customizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estabelecimento gerencia vinculos de telas"
  ON public.usuario_telas_customizadas
  FOR ALL
  TO authenticated
  USING (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()));
