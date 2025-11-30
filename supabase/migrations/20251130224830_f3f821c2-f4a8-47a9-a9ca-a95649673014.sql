-- Tabela de fontes de pesquisa de preços
CREATE TABLE public.fontes_pesquisa_precos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome_fonte VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('api', 'scraping', 'arquivo_importado')),
  config_json JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de mapeamento produto x fonte
CREATE TABLE public.produtos_fontes_precos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fonte_id UUID NOT NULL REFERENCES public.fontes_pesquisa_precos(id) ON DELETE CASCADE,
  termo_busca TEXT,
  termo_busca_alternativo TEXT,
  url_direta TEXT,
  chave_correspondencia VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(produto_id, fonte_id)
);

-- Tabela de histórico de preços encontrados
CREATE TABLE public.historico_precos_concorrentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fonte_id UUID NOT NULL REFERENCES public.fontes_pesquisa_precos(id) ON DELETE CASCADE,
  nome_anuncio TEXT,
  preco_encontrado NUMERIC(15,2),
  url_anuncio TEXT,
  data_coleta DATE DEFAULT CURRENT_DATE,
  detalhes_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de arquivos importados
CREATE TABLE public.arquivos_precos_importados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  fonte_id UUID NOT NULL REFERENCES public.fontes_pesquisa_precos(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho_armazenamento TEXT,
  mapeamento_colunas_json JSONB DEFAULT '{}'::jsonb,
  data_importacao TIMESTAMPTZ DEFAULT now()
);

-- Tabela de linhas de arquivo de preços
CREATE TABLE public.linhas_arquivo_precos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_id UUID NOT NULL REFERENCES public.arquivos_precos_importados(id) ON DELETE CASCADE,
  nome_produto TEXT,
  sku VARCHAR(100),
  ean VARCHAR(50),
  preco NUMERIC(15,2),
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs do monitor de preços
CREATE TABLE public.logs_monitor_preco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  fonte_id UUID REFERENCES public.fontes_pesquisa_precos(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('info', 'erro')),
  mensagem TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_fontes_pesquisa_estabelecimento ON public.fontes_pesquisa_precos(estabelecimento_id);
CREATE INDEX idx_produtos_fontes_produto ON public.produtos_fontes_precos(produto_id);
CREATE INDEX idx_produtos_fontes_fonte ON public.produtos_fontes_precos(fonte_id);
CREATE INDEX idx_historico_precos_produto ON public.historico_precos_concorrentes(produto_id);
CREATE INDEX idx_historico_precos_fonte ON public.historico_precos_concorrentes(fonte_id);
CREATE INDEX idx_historico_precos_data ON public.historico_precos_concorrentes(data_coleta DESC);
CREATE INDEX idx_logs_monitor_estabelecimento ON public.logs_monitor_preco(estabelecimento_id);

-- Enable RLS
ALTER TABLE public.fontes_pesquisa_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos_fontes_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_precos_concorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos_precos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linhas_arquivo_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_monitor_preco ENABLE ROW LEVEL SECURITY;

-- RLS Policies para fontes_pesquisa_precos
CREATE POLICY "Usuários podem ver fontes do estabelecimento" ON public.fontes_pesquisa_precos
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem gerenciar fontes do estabelecimento" ON public.fontes_pesquisa_precos
  FOR ALL USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- RLS Policies para produtos_fontes_precos
CREATE POLICY "Usuários podem ver mapeamentos" ON public.produtos_fontes_precos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM produtos p 
      WHERE p.id = produto_id 
      AND (p.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Usuários podem gerenciar mapeamentos" ON public.produtos_fontes_precos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM produtos p 
      WHERE p.id = produto_id 
      AND (p.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

-- RLS Policies para historico_precos_concorrentes
CREATE POLICY "Usuários podem ver histórico do estabelecimento" ON public.historico_precos_concorrentes
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode inserir histórico" ON public.historico_precos_concorrentes
  FOR INSERT WITH CHECK (true);

-- RLS Policies para arquivos_precos_importados
CREATE POLICY "Usuários podem ver arquivos do estabelecimento" ON public.arquivos_precos_importados
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem gerenciar arquivos do estabelecimento" ON public.arquivos_precos_importados
  FOR ALL USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- RLS Policies para linhas_arquivo_precos
CREATE POLICY "Usuários podem ver linhas via arquivo" ON public.linhas_arquivo_precos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arquivos_precos_importados a 
      WHERE a.id = arquivo_id 
      AND (a.estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
           OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Sistema pode gerenciar linhas" ON public.linhas_arquivo_precos
  FOR ALL USING (true);

-- RLS Policies para logs_monitor_preco
CREATE POLICY "Usuários podem ver logs do estabelecimento" ON public.logs_monitor_preco
  FOR SELECT USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid()) 
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode inserir logs" ON public.logs_monitor_preco
  FOR INSERT WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_fontes_pesquisa_precos_updated_at
  BEFORE UPDATE ON public.fontes_pesquisa_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_fontes_precos_updated_at
  BEFORE UPDATE ON public.produtos_fontes_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();