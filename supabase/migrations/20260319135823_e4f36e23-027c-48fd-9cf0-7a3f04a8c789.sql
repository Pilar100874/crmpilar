
-- Table to store artifact version history for diff comparison
CREATE TABLE public.strategy_artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.strategy_projects(id) ON DELETE CASCADE NOT NULL,
  artifact_id UUID REFERENCES public.strategy_artifacts(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_artifact_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view artifact versions" ON public.strategy_artifact_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert artifact versions" ON public.strategy_artifact_versions
  FOR INSERT TO authenticated WITH CHECK (true);
