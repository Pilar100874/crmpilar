-- Tabela para salvar presets de recursos de marketing
CREATE TABLE public.marketing_resource_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  field_values JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_marketing_resource_presets_resource ON public.marketing_resource_presets(estabelecimento_id, resource_id);

-- Habilitar RLS
ALTER TABLE public.marketing_resource_presets ENABLE ROW LEVEL SECURITY;

-- Política de acesso público (seguindo padrão das outras tabelas de marketing)
CREATE POLICY "Allow all operations on marketing_resource_presets"
ON public.marketing_resource_presets
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_marketing_resource_presets_updated_at
BEFORE UPDATE ON public.marketing_resource_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();