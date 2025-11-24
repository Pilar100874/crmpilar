-- Knowledge Base System Tables

-- Categorias de artigos da base de conhecimento
CREATE TABLE IF NOT EXISTS public.kb_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(7), -- Cor em hexadecimal para identificação visual
  icone VARCHAR(50), -- Nome do ícone lucide-react
  ordem INTEGER DEFAULT 0,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags para artigos
CREATE TABLE IF NOT EXISTS public.kb_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estabelecimento_id, nome)
);

-- Artigos da base de conhecimento
CREATE TABLE IF NOT EXISTS public.kb_artigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.kb_categorias(id) ON DELETE SET NULL,
  titulo VARCHAR(500) NOT NULL,
  conteudo TEXT NOT NULL,
  resumo TEXT,
  autor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  visualizacoes INTEGER DEFAULT 0,
  util_count INTEGER DEFAULT 0, -- Quantas vezes foi marcado como útil
  nao_util_count INTEGER DEFAULT 0, -- Quantas vezes foi marcado como não útil
  palavras_chave TEXT[], -- Array de palavras-chave para busca
  publico BOOLEAN DEFAULT false, -- Se verdadeiro, pode ser acessado sem login
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  publicado_em TIMESTAMPTZ
);

-- Relacionamento entre artigos e tags
CREATE TABLE IF NOT EXISTS public.kb_artigo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.kb_artigos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.kb_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artigo_id, tag_id)
);

-- Anexos de artigos (imagens, PDFs, etc.)
CREATE TABLE IF NOT EXISTS public.kb_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.kb_artigos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100), -- MIME type
  tamanho INTEGER, -- Tamanho em bytes
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de visualizações e feedback
CREATE TABLE IF NOT EXISTS public.kb_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.kb_artigos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  util BOOLEAN NOT NULL, -- true = útil, false = não útil
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Artigos relacionados (sugestões)
CREATE TABLE IF NOT EXISTS public.kb_artigos_relacionados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artigo_id UUID NOT NULL REFERENCES public.kb_artigos(id) ON DELETE CASCADE,
  artigo_relacionado_id UUID NOT NULL REFERENCES public.kb_artigos(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artigo_id, artigo_relacionado_id),
  CHECK (artigo_id != artigo_relacionado_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kb_artigos_estabelecimento ON public.kb_artigos(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_kb_artigos_categoria ON public.kb_artigos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_kb_artigos_status ON public.kb_artigos(status);
CREATE INDEX IF NOT EXISTS idx_kb_artigos_palavras_chave ON public.kb_artigos USING GIN(palavras_chave);
CREATE INDEX IF NOT EXISTS idx_kb_categorias_estabelecimento ON public.kb_categorias(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_kb_tags_estabelecimento ON public.kb_tags(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_artigo ON public.kb_feedback(artigo_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_kb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kb_categorias_updated_at
  BEFORE UPDATE ON public.kb_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_updated_at();

CREATE TRIGGER update_kb_artigos_updated_at
  BEFORE UPDATE ON public.kb_artigos
  FOR EACH ROW
  EXECUTE FUNCTION update_kb_updated_at();

-- RLS Policies

-- kb_categorias
ALTER TABLE public.kb_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver categorias do seu estabelecimento"
  ON public.kb_categorias FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Admins e gestores podem gerenciar categorias"
  ON public.kb_categorias FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- kb_tags
ALTER TABLE public.kb_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver tags do seu estabelecimento"
  ON public.kb_tags FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Admins e gestores podem gerenciar tags"
  ON public.kb_tags FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- kb_artigos
ALTER TABLE public.kb_artigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver artigos publicados do seu estabelecimento"
  ON public.kb_artigos FOR SELECT
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND status = 'publicado')
    OR (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
        AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
    OR (publico = true AND status = 'publicado')
  );

CREATE POLICY "Admins e gestores podem gerenciar artigos"
  ON public.kb_artigos FOR ALL
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
     AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- kb_artigo_tags
ALTER TABLE public.kb_artigo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver tags de artigos"
  ON public.kb_artigo_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins e gestores podem gerenciar tags de artigos"
  ON public.kb_artigo_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
         AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

-- kb_anexos
ALTER TABLE public.kb_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver anexos de artigos acessíveis"
  ON public.kb_anexos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND status = 'publicado')
        OR (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
            AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
        OR (publico = true AND status = 'publicado')
      )
    )
  );

CREATE POLICY "Admins e gestores podem gerenciar anexos"
  ON public.kb_anexos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
         AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

-- kb_feedback
ALTER TABLE public.kb_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver feedback de artigos do seu estabelecimento"
  ON public.kb_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Usuários autenticados podem dar feedback"
  ON public.kb_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- kb_artigos_relacionados
ALTER TABLE public.kb_artigos_relacionados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver artigos relacionados"
  ON public.kb_artigos_relacionados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins e gestores podem gerenciar artigos relacionados"
  ON public.kb_artigos_relacionados FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kb_artigos 
      WHERE id = artigo_id 
      AND (
        (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
         AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role)))
        OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
      )
    )
  );