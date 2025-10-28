-- Criar tabela de grupos de produtos
CREATE TABLE public.produto_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  percentual_comissao NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de categorias de produtos
CREATE TABLE public.produto_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  largura NUMERIC(10,2),
  gramatura NUMERIC(10,2),
  comprimento NUMERIC(10,2),
  peso_unitario NUMERIC(10,3),
  foto_url TEXT,
  categoria_id UUID REFERENCES public.produto_categorias(id),
  grupo_id UUID REFERENCES public.produto_grupos(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de condições de pagamento
CREATE TABLE public.condicoes_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_minimo NUMERIC(10,2) DEFAULT 0,
  valor_maximo NUMERIC(10,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de tabelas de preço
CREATE TABLE public.tabelas_preco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  unidade_id UUID REFERENCES public.unidades(id),
  categoria_id UUID REFERENCES public.produto_categorias(id),
  preco_minimo NUMERIC(10,2) NOT NULL,
  preco_tabela NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de orçamentos/pedidos
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id),
  cliente_id UUID REFERENCES public.customers(id),
  vendedor_id UUID REFERENCES public.usuarios(id),
  unidade_id UUID REFERENCES public.unidades(id),
  condicao_pagamento_id UUID REFERENCES public.condicoes_pagamento(id),
  etapa TEXT NOT NULL DEFAULT 'orcamento',
  status TEXT NOT NULL DEFAULT 'em_aberto',
  valor_total NUMERIC(10,2) DEFAULT 0,
  valor_desconto NUMERIC(10,2) DEFAULT 0,
  percentual_desconto NUMERIC(5,2) DEFAULT 0,
  observacoes TEXT,
  motivo_perda TEXT,
  token_compartilhamento TEXT UNIQUE,
  data_envio TIMESTAMP WITH TIME ZONE,
  data_visualizacao TIMESTAMP WITH TIME ZONE,
  data_modificacao_cliente TIMESTAMP WITH TIME ZONE,
  orcamento_origem_id UUID REFERENCES public.orcamentos(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (etapa IN ('orcamento', 'negociacao', 'aprovacao_gerencia', 'perdido', 'finalizado'))
);

-- Criar tabela de itens do orçamento
CREATE TABLE public.orcamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  quantidade NUMERIC(10,2) NOT NULL,
  preco_unitario NUMERIC(10,2) NOT NULL,
  preco_original NUMERIC(10,2) NOT NULL,
  desconto NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de histórico de modificações do orçamento
CREATE TABLE public.orcamento_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  usuario_id UUID,
  tipo_usuario TEXT NOT NULL,
  acao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CHECK (tipo_usuario IN ('vendedor', 'cliente', 'gerente', 'sistema'))
);

-- Criar tabela de produtos sugeridos
CREATE TABLE public.produtos_sugeridos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  enviado BOOLEAN DEFAULT false,
  aceito BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.produto_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produto_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condicoes_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabelas_preco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_sugeridos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para produto_grupos
CREATE POLICY "View grupos (same estab or admin)" ON public.produto_grupos
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage grupos (admin/gestor or admin)" ON public.produto_grupos
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para produto_categorias
CREATE POLICY "View categorias (same estab or admin)" ON public.produto_categorias
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage categorias (admin/gestor or admin)" ON public.produto_categorias
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para produtos
CREATE POLICY "View produtos (same estab or admin)" ON public.produtos
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage produtos (admin/gestor or admin)" ON public.produtos
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para condicoes_pagamento
CREATE POLICY "View condicoes pagamento (same estab or admin)" ON public.condicoes_pagamento
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage condicoes pagamento (admin/gestor or admin)" ON public.condicoes_pagamento
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para tabelas_preco
CREATE POLICY "View tabelas preco (same estab or admin)" ON public.tabelas_preco
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Manage tabelas preco (admin/gestor or admin)" ON public.tabelas_preco
  FOR ALL USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor')))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para orcamentos
CREATE POLICY "View orcamentos (same estab or admin or token)" ON public.orcamentos
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    OR token_compartilhamento IS NOT NULL
  );

CREATE POLICY "Manage orcamentos (same estab or admin)" ON public.orcamentos
  FOR ALL USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  )
  WITH CHECK (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Políticas RLS para orcamento_itens
CREATE POLICY "View orcamento itens (same estab or admin)" ON public.orcamento_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Manage orcamento itens (same estab or admin)" ON public.orcamento_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- Políticas RLS para orcamento_historico
CREATE POLICY "View orcamento historico (same estab or admin)" ON public.orcamento_historico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Insert orcamento historico (same estab or admin)" ON public.orcamento_historico
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- Políticas RLS para produtos_sugeridos
CREATE POLICY "View produtos sugeridos (same estab or admin)" ON public.produtos_sugeridos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Manage produtos sugeridos (same estab or admin)" ON public.produtos_sugeridos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orcamentos o 
      WHERE o.id = orcamento_id 
      AND (o.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- Criar índices para performance
CREATE INDEX idx_produtos_estabelecimento ON public.produtos(estabelecimento_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_grupo ON public.produtos(grupo_id);
CREATE INDEX idx_orcamentos_estabelecimento ON public.orcamentos(estabelecimento_id);
CREATE INDEX idx_orcamentos_cliente ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_vendedor ON public.orcamentos(vendedor_id);
CREATE INDEX idx_orcamentos_etapa ON public.orcamentos(etapa);
CREATE INDEX idx_orcamentos_token ON public.orcamentos(token_compartilhamento);
CREATE INDEX idx_orcamento_itens_orcamento ON public.orcamento_itens(orcamento_id);
CREATE INDEX idx_orcamento_itens_produto ON public.orcamento_itens(produto_id);

-- Criar triggers para updated_at
CREATE TRIGGER update_produto_grupos_updated_at
  BEFORE UPDATE ON public.produto_grupos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produto_categorias_updated_at
  BEFORE UPDATE ON public.produto_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_condicoes_pagamento_updated_at
  BEFORE UPDATE ON public.condicoes_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tabelas_preco_updated_at
  BEFORE UPDATE ON public.tabelas_preco
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamento_itens_updated_at
  BEFORE UPDATE ON public.orcamento_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();