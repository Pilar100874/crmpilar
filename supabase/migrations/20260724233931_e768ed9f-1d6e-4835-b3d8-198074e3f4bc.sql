
CREATE TABLE public.assistente_voz_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  wake_word_ativo boolean NOT NULL DEFAULT false,
  responder_por_voz boolean NOT NULL DEFAULT true,
  voz text NOT NULL DEFAULT 'alloy',
  wake_word text NOT NULL DEFAULT 'ei pilar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_voz_config TO authenticated;
GRANT ALL ON public.assistente_voz_config TO service_role;
ALTER TABLE public.assistente_voz_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario gerencia sua config voz" ON public.assistente_voz_config
  FOR ALL USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

CREATE TABLE public.assistente_voz_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  estabelecimento_id uuid,
  transcricao text,
  resposta text,
  acao jsonb,
  sucesso boolean NOT NULL DEFAULT true,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assistente_voz_log TO authenticated;
GRANT ALL ON public.assistente_voz_log TO service_role;
ALTER TABLE public.assistente_voz_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve seu log de voz" ON public.assistente_voz_log
  FOR SELECT USING (auth.uid() = auth_user_id);
CREATE POLICY "Usuario insere seu log de voz" ON public.assistente_voz_log
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE INDEX idx_assistente_voz_log_user ON public.assistente_voz_log(auth_user_id, created_at DESC);
