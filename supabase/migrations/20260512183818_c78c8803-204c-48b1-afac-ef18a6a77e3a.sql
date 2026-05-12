-- Tabela para credenciais de redes sociais por estabelecimento
CREATE TABLE IF NOT EXISTS public.social_media_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  platform text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, platform)
);

ALTER TABLE public.social_media_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários do estabelecimento veem suas credenciais"
ON public.social_media_credentials FOR SELECT
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários do estabelecimento inserem credenciais"
ON public.social_media_credentials FOR INSERT
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários do estabelecimento atualizam credenciais"
ON public.social_media_credentials FOR UPDATE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários do estabelecimento removem credenciais"
ON public.social_media_credentials FOR DELETE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_social_media_credentials_updated_at
BEFORE UPDATE ON public.social_media_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();