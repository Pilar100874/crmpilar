CREATE TABLE public.fiscal_tipos_operacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  operacao_base text NOT NULL DEFAULT 'venda',
  natureza_operacao text,
  finalidade_nfe smallint NOT NULL DEFAULT 1 CHECK (finalidade_nfe BETWEEN 1 AND 4),
  movimenta_estoque boolean NOT NULL DEFAULT true,
  gera_financeiro boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_tipos_operacao TO authenticated;
GRANT ALL ON public.fiscal_tipos_operacao TO service_role;
ALTER TABLE public.fiscal_tipos_operacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internos gerenciam tipos de operação" ON public.fiscal_tipos_operacao FOR ALL TO authenticated
  USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());

ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS tipo_operacao_id uuid REFERENCES public.fiscal_tipos_operacao(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consumidor_final_venda boolean,
  ADD COLUMN IF NOT EXISTS destinacao_mercadoria text CHECK (destinacao_mercadoria IN ('revenda','uso_consumo','industrializacao','ativo')),
  ADD COLUMN IF NOT EXISTS presenca_comprador text CHECK (presenca_comprador IN ('1','2','3','4','5','9'));

ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS tipo_operacao_id uuid REFERENCES public.fiscal_tipos_operacao(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finalidade_emissao smallint,
  ADD COLUMN IF NOT EXISTS consumidor_final boolean,
  ADD COLUMN IF NOT EXISTS presenca_comprador text,
  ADD COLUMN IF NOT EXISTS destinacao_mercadoria text;