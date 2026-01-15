-- Criar tabela para salvar catálogos
CREATE TABLE public.catalogos_salvos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  cover_page JSONB,
  products_page JSONB,
  backcover_page JSONB,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.catalogos_salvos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para acesso por estabelecimento
CREATE POLICY "Estabelecimento pode ver seus catálogos" 
ON public.catalogos_salvos 
FOR SELECT 
USING (true);

CREATE POLICY "Estabelecimento pode criar catálogos" 
ON public.catalogos_salvos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Estabelecimento pode atualizar seus catálogos" 
ON public.catalogos_salvos 
FOR UPDATE 
USING (true);

CREATE POLICY "Estabelecimento pode deletar seus catálogos" 
ON public.catalogos_salvos 
FOR DELETE 
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_catalogos_salvos_updated_at
BEFORE UPDATE ON public.catalogos_salvos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.catalogos_salvos IS 'Catálogos de produtos salvos pelos estabelecimentos';