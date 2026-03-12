
CREATE TABLE public.video_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT 'Projeto sem título',
  thumbnail TEXT,
  timeline_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  video_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.video_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
