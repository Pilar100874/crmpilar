CREATE TABLE IF NOT EXISTS public.sip_config_usuario (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sip_config_usuario TO authenticated;
GRANT ALL ON public.sip_config_usuario TO service_role;

ALTER TABLE public.sip_config_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario gerencia sua config sip" ON public.sip_config_usuario;
CREATE POLICY "Usuario gerencia sua config sip"
ON public.sip_config_usuario FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);