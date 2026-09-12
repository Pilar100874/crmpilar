CREATE TABLE public.automacao_app_chaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  bloqueado boolean NOT NULL DEFAULT false,
  ultima_comunicacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automacao_app_chaves TO authenticated;
GRANT ALL ON public.automacao_app_chaves TO service_role;

ALTER TABLE public.automacao_app_chaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY automacao_app_chaves_tenant_all ON public.automacao_app_chaves
FOR ALL TO authenticated
USING (estabelecimento_id = get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_automacao_app_chaves_updated_at
BEFORE UPDATE ON public.automacao_app_chaves
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();