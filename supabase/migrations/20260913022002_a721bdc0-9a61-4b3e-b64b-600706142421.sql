CREATE TABLE public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL DEFAULT public.get_auth_user_estabelecimento_id(),
  app text NOT NULL,
  versao text NOT NULL,
  arquivo_nome text,
  arquivo_url text NOT NULL,
  tamanho_bytes bigint,
  notas text,
  obrigatorio boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, app, versao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_releases TO authenticated;
GRANT ALL ON public.app_releases TO service_role;

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_releases_tenant_all ON public.app_releases
  FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_app_releases_updated_at
  BEFORE UPDATE ON public.app_releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();