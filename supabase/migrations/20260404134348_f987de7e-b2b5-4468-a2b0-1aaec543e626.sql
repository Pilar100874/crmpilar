
-- Create contagens table
CREATE TABLE public.contagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE NOT NULL,
  tipo_objeto TEXT NOT NULL DEFAULT 'generico',
  quantidade_detectada INTEGER DEFAULT 0,
  quantidade_esperada INTEGER,
  confianca_media NUMERIC(5,2),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  imagem_url TEXT,
  resultado_url TEXT,
  bounding_boxes JSONB DEFAULT '[]'::jsonb,
  divergencia BOOLEAN DEFAULT false,
  data_analise TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contagens ENABLE ROW LEVEL SECURITY;

-- RLS policies - users see only their own
CREATE POLICY "Users can view own contagens" ON public.contagens
  FOR SELECT TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create own contagens" ON public.contagens
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own contagens" ON public.contagens
  FOR UPDATE TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own contagens" ON public.contagens
  FOR DELETE TO authenticated
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Updated at trigger
CREATE TRIGGER update_contagens_updated_at
  BEFORE UPDATE ON public.contagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for counting images
INSERT INTO storage.buckets (id, name, public) VALUES ('contagens-images', 'contagens-images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload contagens images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contagens-images');

CREATE POLICY "Anyone can view contagens images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'contagens-images');

CREATE POLICY "Users can delete own contagens images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contagens-images');
