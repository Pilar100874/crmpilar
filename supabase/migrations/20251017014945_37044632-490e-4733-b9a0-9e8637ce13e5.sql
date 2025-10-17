-- Criar tabela de unidades (filiais)
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de segmentos
CREATE TABLE public.segmentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de grupos de acesso
CREATE TABLE public.grupos_acesso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  menus_permitidos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de usuários
CREATE TABLE public.usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  senha_hash TEXT NOT NULL,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  grupo_acesso_id UUID REFERENCES public.grupos_acesso(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de relacionamento usuario-segmento (muitos para muitos)
CREATE TABLE public.usuario_segmentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  segmento_id UUID REFERENCES public.segmentos(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(usuario_id, segmento_id)
);

-- Habilitar RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_segmentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para unidades
CREATE POLICY "Authenticated users can view unidades"
  ON public.unidades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage unidades"
  ON public.unidades FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para segmentos
CREATE POLICY "Authenticated users can view segmentos"
  ON public.segmentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage segmentos"
  ON public.segmentos FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para grupos_acesso
CREATE POLICY "Authenticated users can view grupos_acesso"
  ON public.grupos_acesso FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage grupos_acesso"
  ON public.grupos_acesso FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para usuarios
CREATE POLICY "Authenticated users can view usuarios"
  ON public.usuarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage usuarios"
  ON public.usuarios FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para usuario_segmentos
CREATE POLICY "Authenticated users can view usuario_segmentos"
  ON public.usuario_segmentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage usuario_segmentos"
  ON public.usuario_segmentos FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_unidades_updated_at
  BEFORE UPDATE ON public.unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segmentos_updated_at
  BEFORE UPDATE ON public.segmentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grupos_acesso_updated_at
  BEFORE UPDATE ON public.grupos_acesso
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();