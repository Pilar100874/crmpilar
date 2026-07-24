
CREATE TABLE public.assistente_voz_comandos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  frase_gatilho text NOT NULL,
  descricao text,
  tipo_acao text NOT NULL CHECK (tipo_acao IN ('navegar','consultar_metrica','responder','disparar_bot','comando_tv')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resposta_falada text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_voz_comandos TO authenticated;
GRANT ALL ON public.assistente_voz_comandos TO service_role;

ALTER TABLE public.assistente_voz_comandos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios do estab veem comandos voz"
  ON public.assistente_voz_comandos FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins gerenciam comandos voz"
  ON public.assistente_voz_comandos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_assistente_voz_comandos_estab ON public.assistente_voz_comandos(estabelecimento_id, ativo);

CREATE TRIGGER update_assistente_voz_comandos_updated_at
  BEFORE UPDATE ON public.assistente_voz_comandos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.assistente_voz_config
  ADD COLUMN IF NOT EXISTS ferramentas_desativadas text[] NOT NULL DEFAULT ARRAY[]::text[];
