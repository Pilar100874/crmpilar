
-- Aprovação multinível para ajustes de ponto e afastamentos
ALTER TABLE public.ponto_ajustes
  ADD COLUMN IF NOT EXISTS nivel_aprovacao_atual smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nivel_aprovacao_max smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS aprovacoes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.ponto_ferias_afastamentos
  ADD COLUMN IF NOT EXISTS nivel_aprovacao_atual smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nivel_aprovacao_max smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS aprovacoes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Configuração de fluxo de aprovação por empresa
CREATE TABLE IF NOT EXISTS public.ponto_aprovacao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  entidade text NOT NULL CHECK (entidade IN ('ajuste','afastamento','ferias')),
  niveis jsonb NOT NULL DEFAULT '[{"nivel":1,"papel":"gestor"},{"nivel":2,"papel":"rh"}]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, entidade)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_aprovacao_config TO authenticated;
GRANT ALL ON public.ponto_aprovacao_config TO service_role;
ALTER TABLE public.ponto_aprovacao_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa membros ponto_aprovacao_config" ON public.ponto_aprovacao_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ponto_empresas pe
            WHERE pe.id = empresa_id
              AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ponto_empresas pe
            WHERE pe.id = empresa_id
              AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id())
  );

-- Webhook público de catracas/relógios (tempo real)
CREATE TABLE IF NOT EXISTS public.ponto_webhook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.ponto_equipamentos(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ultima_chamada timestamptz,
  total_chamadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_webhook_tokens TO authenticated;
GRANT ALL ON public.ponto_webhook_tokens TO service_role;
ALTER TABLE public.ponto_webhook_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresa membros ponto_webhook_tokens" ON public.ponto_webhook_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ponto_empresas pe
            WHERE pe.id = empresa_id
              AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ponto_empresas pe
            WHERE pe.id = empresa_id
              AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id())
  );

CREATE TRIGGER trg_ponto_aprovacao_config_updated
  BEFORE UPDATE ON public.ponto_aprovacao_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ponto_webhook_tokens_updated
  BEFORE UPDATE ON public.ponto_webhook_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
