-- Tabela para gerenciar jobs de geração de relatórios
CREATE TABLE IF NOT EXISTS public.relatorio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  reportbro_key text,
  pdf_url text,
  error_message text,
  api_variables jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Índice para buscar jobs por status
CREATE INDEX IF NOT EXISTS idx_relatorio_jobs_status ON public.relatorio_jobs(status);
CREATE INDEX IF NOT EXISTS idx_relatorio_jobs_relatorio_id ON public.relatorio_jobs(relatorio_id);

-- RLS policies
ALTER TABLE public.relatorio_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver seus jobs"
  ON public.relatorio_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir jobs"
  ON public.relatorio_jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar jobs"
  ON public.relatorio_jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_relatorio_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_relatorio_jobs_updated_at
  BEFORE UPDATE ON public.relatorio_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorio_jobs_updated_at();