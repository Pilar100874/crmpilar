-- Create table for logistics automations
CREATE TABLE public.logistica_automacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  flow_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logistica_automacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view automations from their establishment"
ON public.logistica_automacoes
FOR SELECT
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can create automations in their establishment"
ON public.logistica_automacoes
FOR INSERT
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can update automations in their establishment"
ON public.logistica_automacoes
FOR UPDATE
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can delete automations from their establishment"
ON public.logistica_automacoes
FOR DELETE
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_logistica_automacoes_updated_at
BEFORE UPDATE ON public.logistica_automacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_logistica_automacoes_estabelecimento ON public.logistica_automacoes(estabelecimento_id);