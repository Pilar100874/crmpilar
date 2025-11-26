-- Tabela para armazenar conjuntos de itens por usuário
CREATE TABLE IF NOT EXISTS public.orcamento_conjuntos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_orcamento_conjuntos_usuario_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_orcamento_conjuntos_usuario_estabelecimento FOREIGN KEY (estabelecimento_id) REFERENCES public.estabelecimentos(id) ON DELETE CASCADE
);

-- Tabela para armazenar itens de cada conjunto
CREATE TABLE IF NOT EXISTS public.orcamento_conjuntos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id UUID NOT NULL,
  produto_id UUID NOT NULL,
  quantidade_padrao NUMERIC(10,2) DEFAULT 1,
  preco_padrao NUMERIC(10,2),
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_orcamento_conjuntos_itens_conjunto FOREIGN KEY (conjunto_id) REFERENCES public.orcamento_conjuntos_usuario(id) ON DELETE CASCADE,
  CONSTRAINT fk_orcamento_conjuntos_itens_produto FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_orcamento_conjuntos_usuario_id ON public.orcamento_conjuntos_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_conjuntos_estabelecimento_id ON public.orcamento_conjuntos_usuario(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_conjuntos_itens_conjunto_id ON public.orcamento_conjuntos_itens(conjunto_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_conjuntos_itens_produto_id ON public.orcamento_conjuntos_itens(produto_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_orcamento_conjuntos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orcamento_conjuntos_updated_at
  BEFORE UPDATE ON public.orcamento_conjuntos_usuario
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamento_conjuntos_updated_at();

-- RLS Policies
ALTER TABLE public.orcamento_conjuntos_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_conjuntos_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para orcamento_conjuntos_usuario
CREATE POLICY "Usuários podem ver seus próprios conjuntos"
  ON public.orcamento_conjuntos_usuario
  FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar seus próprios conjuntos"
  ON public.orcamento_conjuntos_usuario
  FOR INSERT
  WITH CHECK (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar seus próprios conjuntos"
  ON public.orcamento_conjuntos_usuario
  FOR UPDATE
  USING (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar seus próprios conjuntos"
  ON public.orcamento_conjuntos_usuario
  FOR DELETE
  USING (
    usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
  );

-- Políticas para orcamento_conjuntos_itens
CREATE POLICY "Usuários podem ver itens de seus conjuntos"
  ON public.orcamento_conjuntos_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamento_conjuntos_usuario
      WHERE id = conjunto_id
      AND (
        usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Usuários podem criar itens em seus conjuntos"
  ON public.orcamento_conjuntos_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orcamento_conjuntos_usuario
      WHERE id = conjunto_id
      AND usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem atualizar itens de seus conjuntos"
  ON public.orcamento_conjuntos_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamento_conjuntos_usuario
      WHERE id = conjunto_id
      AND usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Usuários podem deletar itens de seus conjuntos"
  ON public.orcamento_conjuntos_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamento_conjuntos_usuario
      WHERE id = conjunto_id
      AND usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
    )
  );