-- Create table to store generated n8n workflows
CREATE TABLE public.n8n_workflows_gerados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  prompt_original TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  variaveis_ambiente JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.n8n_workflows_gerados ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view workflows from their establishment"
ON public.n8n_workflows_gerados
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create workflows for their establishment"
ON public.n8n_workflows_gerados
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update workflows from their establishment"
ON public.n8n_workflows_gerados
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete workflows from their establishment"
ON public.n8n_workflows_gerados
FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_n8n_workflows_gerados_updated_at
BEFORE UPDATE ON public.n8n_workflows_gerados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();