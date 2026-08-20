CREATE TABLE IF NOT EXISTS public.tv_murais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  duracao_padrao_imagem integer NOT NULL DEFAULT 8,
  transicao text NOT NULL DEFAULT 'cinematic_fade',
  transicao_ms integer NOT NULL DEFAULT 1200,
  loop boolean NOT NULL DEFAULT true,
  embaralhar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_murais TO authenticated;
GRANT ALL ON public.tv_murais TO service_role;

ALTER TABLE public.tv_murais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tv_murais_tenant_all ON public.tv_murais;
CREATE POLICY tv_murais_tenant_all ON public.tv_murais
  AS PERMISSIVE FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id());

CREATE INDEX IF NOT EXISTS tv_murais_estab_idx ON public.tv_murais (estabelecimento_id);