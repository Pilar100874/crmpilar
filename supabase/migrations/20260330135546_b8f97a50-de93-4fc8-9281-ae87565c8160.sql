
-- E-commerce configuration table for branding, content, etc.
CREATE TABLE public.ecommerce_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  logo_url TEXT,
  background_video_url TEXT,
  background_type TEXT DEFAULT 'gradient',
  nome_loja TEXT DEFAULT 'Minha Loja',
  slogan TEXT,
  cor_primaria TEXT DEFAULT '#000000',
  cor_secundaria TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

ALTER TABLE public.ecommerce_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ecommerce config" ON public.ecommerce_config
  FOR SELECT USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can insert own ecommerce config" ON public.ecommerce_config
  FOR INSERT WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can update own ecommerce config" ON public.ecommerce_config
  FOR UPDATE USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE TRIGGER update_ecommerce_config_updated_at
  BEFORE UPDATE ON public.ecommerce_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- E-commerce content pages (about, faq, privacy, etc.)
CREATE TABLE public.ecommerce_conteudos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'sobre', 'contato', 'faq', 'privacidade', 'termos', 'entrega', 'trocas'
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  dados_json JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, tipo)
);

ALTER TABLE public.ecommerce_conteudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ecommerce content" ON public.ecommerce_conteudos
  FOR SELECT USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can insert own ecommerce content" ON public.ecommerce_conteudos
  FOR INSERT WITH CHECK (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can update own ecommerce content" ON public.ecommerce_conteudos
  FOR UPDATE USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Users can delete own ecommerce content" ON public.ecommerce_conteudos
  FOR DELETE USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Public can view active content" ON public.ecommerce_conteudos
  FOR SELECT USING (ativo = true);

CREATE TRIGGER update_ecommerce_conteudos_updated_at
  BEFORE UPDATE ON public.ecommerce_conteudos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- E-commerce ads/banners
CREATE TABLE public.ecommerce_anuncios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  link_url TEXT,
  posicao TEXT DEFAULT 'home_banner', -- 'home_banner', 'sidebar', 'popup', 'footer', 'catalogo_topo'
  tipo TEXT DEFAULT 'imagem', -- 'imagem', 'video', 'html'
  html_conteudo TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecommerce_anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ecommerce ads" ON public.ecommerce_anuncios
  FOR ALL USING (public.user_in_estabelecimento(estabelecimento_id));
CREATE POLICY "Public can view active ads" ON public.ecommerce_anuncios
  FOR SELECT USING (ativo = true);

CREATE TRIGGER update_ecommerce_anuncios_updated_at
  BEFORE UPDATE ON public.ecommerce_anuncios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for ecommerce assets
INSERT INTO storage.buckets (id, name, public) VALUES ('ecommerce-assets', 'ecommerce-assets', true);

CREATE POLICY "Authenticated users can upload ecommerce assets"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ecommerce-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view ecommerce assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'ecommerce-assets');
CREATE POLICY "Authenticated users can update ecommerce assets"
  ON storage.objects FOR UPDATE USING (bucket_id = 'ecommerce-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete ecommerce assets"
  ON storage.objects FOR DELETE USING (bucket_id = 'ecommerce-assets' AND auth.role() = 'authenticated');
