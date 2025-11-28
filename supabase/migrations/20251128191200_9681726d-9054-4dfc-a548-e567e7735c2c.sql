-- Tabela para definição de campos customizados por grupo de produto
CREATE TABLE public.produto_campos_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.produto_grupos(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  campo_key VARCHAR(50) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('texto', 'numero', 'selecao', 'checkbox', 'textarea', 'data')),
  opcoes JSONB DEFAULT NULL, -- Para campos tipo 'selecao', armazena as opções
  obrigatorio BOOLEAN DEFAULT false,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  placeholder VARCHAR(200),
  unidade VARCHAR(20), -- Ex: cm, kg, mm
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_id, campo_key)
);

-- Índices para performance
CREATE INDEX idx_produto_campos_customizados_grupo ON public.produto_campos_customizados(grupo_id);
CREATE INDEX idx_produto_campos_customizados_estabelecimento ON public.produto_campos_customizados(estabelecimento_id);

-- RLS
ALTER TABLE public.produto_campos_customizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver campos do seu estabelecimento"
  ON public.produto_campos_customizados FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem inserir campos no seu estabelecimento"
  ON public.produto_campos_customizados FOR INSERT
  WITH CHECK (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar campos do seu estabelecimento"
  ON public.produto_campos_customizados FOR UPDATE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar campos do seu estabelecimento"
  ON public.produto_campos_customizados FOR DELETE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE TRIGGER update_produto_campos_customizados_updated_at
  BEFORE UPDATE ON public.produto_campos_customizados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna custom_fields na tabela produtos se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos' 
    AND column_name = 'campos_customizados'
  ) THEN
    ALTER TABLE public.produtos ADD COLUMN campos_customizados JSONB DEFAULT '{}';
  END IF;
END $$;