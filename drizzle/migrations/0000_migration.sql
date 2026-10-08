CREATE TABLE public.voz_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  modos text[] NOT NULL DEFAULT ARRAY['receber']::text[],
  ramal_ia text,
  ramal_transferencia text,
  saudacao text DEFAULT 'Olá! Sou a assistente virtual. Como posso ajudar?',
  prompt text NOT NULL DEFAULT '',
  qualidade text NOT NULL DEFAULT 'gratuita' CHECK (qualidade IN ('gratuita','premium')),
  stt_provedor text DEFAULT 'deepgram',
  llm_provedor text DEFAULT 'openai',
  llm_modelo text,
  tts_provedor text DEFAULT 'elevenlabs',
  voz text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.voz_chamadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  agente_id uuid REFERENCES public.voz_agentes(id) ON DELETE SET NULL,
  modo text NOT NULL DEFAULT 'receber',
  numero text,
  ramal_monitorado text,
  status text NOT NULL DEFAULT 'em_andamento',
  transcricao jsonb NOT NULL DEFAULT '[]'::jsonb,
  sugestoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumo text,
  duracao_seg integer,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  finalizada_em timestamptz
);
CREATE TABLE public.voz_comandos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  agente_id uuid NOT NULL REFERENCES public.voz_agentes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ligar','assistir')),
  numero text,
  ramal text,
  objetivo text,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  processado_em timestamptz
);
ALTER TABLE public.voz_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voz_chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voz_comandos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voz_agentes, public.voz_chamadas, public.voz_comandos TO authenticated;
GRANT ALL ON public.voz_agentes, public.voz_chamadas, public.voz_comandos TO service_role;
CREATE POLICY voz_agentes_tenant ON public.voz_agentes FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY voz_chamadas_tenant ON public.voz_chamadas FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
CREATE POLICY voz_comandos_tenant ON public.voz_comandos FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() OR public.is_system_admin());
ALTER PUBLICATION supabase_realtime ADD TABLE public.voz_chamadas;