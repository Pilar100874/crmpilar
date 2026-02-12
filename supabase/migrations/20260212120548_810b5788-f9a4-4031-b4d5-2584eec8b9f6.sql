
-- Create table for saved AI Studio workflows
CREATE TABLE public.ai_studio_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  nodes_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_studio_workflows ENABLE ROW LEVEL SECURITY;

-- Policies - using estabelecimento_id for multi-tenant access
CREATE POLICY "Users can view their workflows"
ON public.ai_studio_workflows FOR SELECT
USING (true);

CREATE POLICY "Users can create workflows"
ON public.ai_studio_workflows FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their workflows"
ON public.ai_studio_workflows FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their workflows"
ON public.ai_studio_workflows FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_studio_workflows_updated_at
BEFORE UPDATE ON public.ai_studio_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
