-- Create report_templates table for JSReport
CREATE TABLE IF NOT EXISTS public.report_templates_jsreport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  template JSONB NOT NULL DEFAULT '{"content": "", "engine": "handlebars", "recipe": "chrome-pdf", "helpers": "", "dataSources": []}'::jsonb,
  database_connection_id UUID REFERENCES public.database_connections(id) ON DELETE SET NULL,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates_jsreport ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own establishment reports"
  ON public.report_templates_jsreport
  FOR SELECT
  USING (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create reports for their establishment"
  ON public.report_templates_jsreport
  FOR INSERT
  WITH CHECK (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their establishment reports"
  ON public.report_templates_jsreport
  FOR UPDATE
  USING (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their establishment reports"
  ON public.report_templates_jsreport
  FOR DELETE
  USING (estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_report_templates_jsreport_updated_at
  BEFORE UPDATE ON public.report_templates_jsreport
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();