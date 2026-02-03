-- Adicionar coluna categoria às frases prontas
ALTER TABLE public.quick_replies 
ADD COLUMN IF NOT EXISTS categoria text;

-- Criar tabela de categorias de frases prontas
CREATE TABLE IF NOT EXISTS public.quick_reply_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_reply_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Users can view their own categories" 
ON public.quick_reply_categories 
FOR SELECT 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own categories" 
ON public.quick_reply_categories 
FOR INSERT 
WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own categories" 
ON public.quick_reply_categories 
FOR UPDATE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own categories" 
ON public.quick_reply_categories 
FOR DELETE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Criar tabela para galeria de mídias centralizada
CREATE TABLE IF NOT EXISTS public.media_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('image', 'video', 'audio', 'document')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tamanho_bytes INTEGER,
  mime_type TEXT,
  thumbnail_url TEXT,
  duracao_segundos INTEGER,
  origem TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;

-- Políticas para galeria de mídias
CREATE POLICY "Users can view their own media" 
ON public.media_gallery 
FOR SELECT 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own media" 
ON public.media_gallery 
FOR INSERT 
WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own media" 
ON public.media_gallery 
FOR UPDATE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own media" 
ON public.media_gallery 
FOR DELETE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Trigger para updated_at na galeria de mídias
CREATE TRIGGER update_media_gallery_updated_at
BEFORE UPDATE ON public.media_gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para envios em massa
CREATE TABLE IF NOT EXISTS public.envio_massa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'enviando', 'concluido', 'cancelado')),
  total_contatos INTEGER DEFAULT 0,
  contatos_enviados INTEGER DEFAULT 0,
  contatos_erro INTEGER DEFAULT 0,
  filtros_aplicados JSONB,
  conteudo JSONB NOT NULL,
  agendado_para TIMESTAMP WITH TIME ZONE,
  iniciado_em TIMESTAMP WITH TIME ZONE,
  finalizado_em TIMESTAMP WITH TIME ZONE,
  proxima_data_contato DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.envio_massa ENABLE ROW LEVEL SECURITY;

-- Políticas para envio em massa
CREATE POLICY "Users can view their own bulk sends" 
ON public.envio_massa 
FOR SELECT 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own bulk sends" 
ON public.envio_massa 
FOR INSERT 
WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own bulk sends" 
ON public.envio_massa 
FOR UPDATE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete their own bulk sends" 
ON public.envio_massa 
FOR DELETE 
USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_envio_massa_updated_at
BEFORE UPDATE ON public.envio_massa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para contatos do envio em massa
CREATE TABLE IF NOT EXISTS public.envio_massa_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  envio_id UUID NOT NULL REFERENCES public.envio_massa(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  erro_mensagem TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.envio_massa_contatos ENABLE ROW LEVEL SECURITY;

-- Políticas para contatos do envio
CREATE POLICY "Users can view bulk send contacts" 
ON public.envio_massa_contatos 
FOR SELECT 
USING (envio_id IN (SELECT id FROM public.envio_massa WHERE estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can insert bulk send contacts" 
ON public.envio_massa_contatos 
FOR INSERT 
WITH CHECK (envio_id IN (SELECT id FROM public.envio_massa WHERE estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can update bulk send contacts" 
ON public.envio_massa_contatos 
FOR UPDATE 
USING (envio_id IN (SELECT id FROM public.envio_massa WHERE estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users can delete bulk send contacts" 
ON public.envio_massa_contatos 
FOR DELETE 
USING (envio_id IN (SELECT id FROM public.envio_massa WHERE estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid())));