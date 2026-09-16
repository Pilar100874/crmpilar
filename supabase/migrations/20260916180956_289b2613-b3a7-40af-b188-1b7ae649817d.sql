CREATE TABLE IF NOT EXISTS public.sip_presenca (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid,
  ramal text NOT NULL,
  origem text NOT NULL DEFAULT 'web',
  em_chamada boolean NOT NULL DEFAULT false,
  dispositivo text,
  ultimo_ping timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sip_presenca_origem_check CHECK (origem IN ('web','apk'))
);

CREATE UNIQUE INDEX IF NOT EXISTS sip_presenca_unico ON public.sip_presenca (estabelecimento_id, ramal, origem);
CREATE INDEX IF NOT EXISTS sip_presenca_ping_idx ON public.sip_presenca (estabelecimento_id, ultimo_ping DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sip_presenca TO authenticated;
GRANT ALL ON public.sip_presenca TO service_role;

ALTER TABLE public.sip_presenca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver presenca da propria empresa"
ON public.sip_presenca FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Registrar propria presenca"
ON public.sip_presenca FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() AND usuario_id = public.get_current_usuario_id());

CREATE POLICY "Atualizar propria presenca"
ON public.sip_presenca FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() AND usuario_id = public.get_current_usuario_id())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id() AND usuario_id = public.get_current_usuario_id());

CREATE POLICY "Remover propria presenca"
ON public.sip_presenca FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id() AND usuario_id = public.get_current_usuario_id());

CREATE TRIGGER sip_presenca_updated_at
BEFORE UPDATE ON public.sip_presenca
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();