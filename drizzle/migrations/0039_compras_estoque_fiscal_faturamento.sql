CREATE TABLE public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  unidade_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  origem text NOT NULL DEFAULT 'ajuste',
  quantidade numeric NOT NULL CHECK (quantidade > 0),
  custo_unitario numeric,
  saldo_anterior numeric,
  saldo_posterior numeric,
  nota_fiscal_id uuid,
  documento text,
  observacao text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.estoque_movimentos (produto_id, created_at DESC);

CREATE TABLE public.compras_cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  fornecedor_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviada','respondida','aprovada','cancelada')),
  observacoes text,
  prazo_resposta date,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.compras_cotacao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.compras_cotacoes(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL,
  unidade text,
  sku_fornecedor text,
  motivo text,
  preco_unitario numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notas_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  unidade_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','lancada','pronta','emitida','cancelada')),
  origem text NOT NULL DEFAULT 'manual',
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  orcamento_id uuid,
  chave text,
  numero text,
  serie text,
  data_emissao date,
  natureza_operacao text,
  participante_nome text,
  participante_cnpj text,
  participante_uf text,
  valor_produtos numeric NOT NULL DEFAULT 0,
  valor_frete numeric NOT NULL DEFAULT 0,
  valor_desconto numeric NOT NULL DEFAULT 0,
  valor_icms numeric NOT NULL DEFAULT 0,
  valor_icms_st numeric NOT NULL DEFAULT 0,
  valor_ipi numeric NOT NULL DEFAULT 0,
  valor_pis numeric NOT NULL DEFAULT 0,
  valor_cofins numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  xml text,
  observacoes text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notas_fiscais_chave_unica ON public.notas_fiscais (estabelecimento_id, chave) WHERE chave IS NOT NULL AND status <> 'cancelada';
CREATE TABLE public.notas_fiscais_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  codigo_origem text,
  descricao text NOT NULL,
  ncm text, cfop text, cst text,
  unidade text,
  quantidade numeric NOT NULL DEFAULT 0,
  fator_conversao numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  aliq_icms numeric NOT NULL DEFAULT 0, valor_icms numeric NOT NULL DEFAULT 0,
  aliq_ipi numeric NOT NULL DEFAULT 0, valor_ipi numeric NOT NULL DEFAULT 0,
  aliq_pis numeric NOT NULL DEFAULT 0, valor_pis numeric NOT NULL DEFAULT 0,
  aliq_cofins numeric NOT NULL DEFAULT 0, valor_cofins numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.regras_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  operacao text NOT NULL DEFAULT 'venda',
  destino text NOT NULL DEFAULT 'interna' CHECK (destino IN ('interna','interestadual','exterior')),
  regime text,
  ncm_prefixo text,
  cfop text NOT NULL,
  cst text,
  aliq_icms numeric NOT NULL DEFAULT 0,
  aliq_ipi numeric NOT NULL DEFAULT 0,
  aliq_pis numeric NOT NULL DEFAULT 0,
  aliq_cofins numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentos, public.compras_cotacoes, public.compras_cotacao_itens, public.notas_fiscais, public.notas_fiscais_itens, public.regras_fiscais TO authenticated;
GRANT ALL ON public.estoque_movimentos, public.compras_cotacoes, public.compras_cotacao_itens, public.notas_fiscais, public.notas_fiscais_itens, public.regras_fiscais TO service_role;

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_cotacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internos gerenciam movimentos" ON public.estoque_movimentos FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos gerenciam cotacoes" ON public.compras_cotacoes FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos gerenciam itens de cotacao" ON public.compras_cotacao_itens FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos gerenciam notas" ON public.notas_fiscais FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos gerenciam itens de notas" ON public.notas_fiscais_itens FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Internos gerenciam regras fiscais" ON public.regras_fiscais FOR ALL TO authenticated
USING (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_usuario_interno(auth.uid()) AND estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE OR REPLACE FUNCTION public.estoque_aplicar_movimento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_saldo numeric;
BEGIN
  SELECT COALESCE(estoque,0) INTO v_saldo FROM public.produtos WHERE id = NEW.produto_id FOR UPDATE;
  NEW.saldo_anterior := v_saldo;
  NEW.saldo_posterior := v_saldo + CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END;
  UPDATE public.produtos SET estoque = round(NEW.saldo_posterior)::integer, updated_at = now() WHERE id = NEW.produto_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_estoque_aplicar_movimento BEFORE INSERT ON public.estoque_movimentos
FOR EACH ROW EXECUTE FUNCTION public.estoque_aplicar_movimento();