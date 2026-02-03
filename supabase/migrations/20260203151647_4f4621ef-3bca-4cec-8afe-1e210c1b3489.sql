-- Criar tabela para templates de mensagens do envio em massa
CREATE TABLE IF NOT EXISTS public.envio_massa_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  conteudo TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.envio_massa_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using user_in_estabelecimento function
CREATE POLICY "Usuários podem ver templates do seu estabelecimento"
ON public.envio_massa_templates
FOR SELECT
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem criar templates do seu estabelecimento"
ON public.envio_massa_templates
FOR INSERT
WITH CHECK (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem atualizar templates do seu estabelecimento"
ON public.envio_massa_templates
FOR UPDATE
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem deletar templates do seu estabelecimento"
ON public.envio_massa_templates
FOR DELETE
USING (user_in_estabelecimento(estabelecimento_id));

-- Create trigger for updated_at
CREATE TRIGGER update_envio_massa_templates_updated_at
BEFORE UPDATE ON public.envio_massa_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_envio_massa_templates_estabelecimento 
ON public.envio_massa_templates(estabelecimento_id);

CREATE INDEX idx_envio_massa_templates_ativo 
ON public.envio_massa_templates(estabelecimento_id, ativo) WHERE ativo = true;