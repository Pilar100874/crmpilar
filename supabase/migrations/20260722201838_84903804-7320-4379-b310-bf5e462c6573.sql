
-- Extensão vetorial para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1) CATEGORIAS
-- =====================================================
CREATE TABLE public.policy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_categories TO authenticated;
GRANT ALL ON public.policy_categories TO service_role;
ALTER TABLE public.policy_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem categorias"
  ON public.policy_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia categorias"
  ON public.policy_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2) POLÍTICAS
-- =====================================================
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.policy_categories(id) ON DELETE SET NULL,
  responsible TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem politicas ativas ou admin le tudo"
  ON public.policies FOR SELECT TO authenticated
  USING (status = 'ativa' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia politicas"
  ON public.policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX policies_category_idx ON public.policies(category_id);
CREATE INDEX policies_status_idx ON public.policies(status);

-- =====================================================
-- 3) ANEXOS
-- =====================================================
CREATE TABLE public.policy_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_attachments TO authenticated;
GRANT ALL ON public.policy_attachments TO service_role;
ALTER TABLE public.policy_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem anexos"
  ON public.policy_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia anexos"
  ON public.policy_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX policy_attachments_policy_idx ON public.policy_attachments(policy_id);

-- =====================================================
-- 4) CHUNKS + EMBEDDINGS
-- =====================================================
CREATE TABLE public.policy_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.policy_chunks TO authenticated;
GRANT ALL ON public.policy_chunks TO service_role;
ALTER TABLE public.policy_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem chunks"
  ON public.policy_chunks FOR SELECT TO authenticated USING (true);

CREATE INDEX policy_chunks_policy_idx ON public.policy_chunks(policy_id);
CREATE INDEX policy_chunks_embedding_idx
  ON public.policy_chunks USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- 5) HISTÓRICO DE PERGUNTAS
-- =====================================================
CREATE TABLE public.policy_ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  policies_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.policy_ai_queries TO authenticated;
GRANT ALL ON public.policy_ai_queries TO service_role;
ALTER TABLE public.policy_ai_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve suas proprias perguntas"
  ON public.policy_ai_queries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Usuario cria suas proprias perguntas"
  ON public.policy_ai_queries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 6) FUNÇÃO DE BUSCA SEMÂNTICA
-- =====================================================
CREATE OR REPLACE FUNCTION public.match_policy_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  policy_id UUID,
  content TEXT,
  chunk_order INTEGER,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id,
    c.policy_id,
    c.content,
    c.chunk_order,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.policy_chunks c
  JOIN public.policies p ON p.id = c.policy_id
  WHERE p.status = 'ativa' AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_policy_chunks(vector, int) TO authenticated, service_role;

-- =====================================================
-- 7) TRIGGER updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_policies_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_policies_updated_at();
CREATE TRIGGER trg_policy_categories_updated_at BEFORE UPDATE ON public.policy_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_policies_updated_at();
CREATE TRIGGER trg_policy_chunks_updated_at BEFORE UPDATE ON public.policy_chunks
  FOR EACH ROW EXECUTE FUNCTION public.set_policies_updated_at();

-- =====================================================
-- 8) SEED DE CATEGORIAS INICIAIS
-- =====================================================
INSERT INTO public.policy_categories (name, ordem) VALUES
  ('Código de Conduta', 1),
  ('Ética e Compliance', 2),
  ('Recursos Humanos', 3),
  ('Segurança da Informação', 4),
  ('Privacidade e LGPD', 5),
  ('Uso de Inteligência Artificial', 6),
  ('Trabalho Remoto', 7),
  ('Uso de Equipamentos', 8),
  ('Uso de E-mail e Internet', 9),
  ('Férias e Ausências', 10),
  ('Viagens e Reembolsos', 11),
  ('Saúde e Segurança', 12),
  ('Assédio e Discriminação', 13),
  ('Canal de Denúncias', 14),
  ('Financeiro', 15),
  ('Compras e Fornecedores', 16),
  ('Comunicação e Redes Sociais', 17),
  ('Logística e Transporte', 18),
  ('Uso de Máquinas e Segurança', 19),
  ('Manutenção e Segurança', 20)
ON CONFLICT (name) DO NOTHING;
