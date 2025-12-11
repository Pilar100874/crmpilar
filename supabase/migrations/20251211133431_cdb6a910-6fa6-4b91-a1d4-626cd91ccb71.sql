-- Tabela para configuração do relatório de orçamento
CREATE TABLE public.orcamento_report_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id)
);

-- Enable RLS
ALTER TABLE public.orcamento_report_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their establishment config"
ON public.orcamento_report_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their establishment config"
ON public.orcamento_report_config
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their establishment config"
ON public.orcamento_report_config
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_orcamento_report_config_updated_at
BEFORE UPDATE ON public.orcamento_report_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for report assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-assets', 'report-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view report assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-assets');

CREATE POLICY "Authenticated users can upload report assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their report assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-assets' AND auth.role() = 'authenticated');