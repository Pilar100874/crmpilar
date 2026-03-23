
-- Add knowledge base fields to strategy_agent_configs
ALTER TABLE public.strategy_agent_configs
ADD COLUMN IF NOT EXISTS knowledge_base_type text NOT NULL DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS knowledge_base_files jsonb DEFAULT '[]'::jsonb;

-- Add knowledge base fields to strategy_custom_agents
ALTER TABLE public.strategy_custom_agents
ADD COLUMN IF NOT EXISTS knowledge_base_type text NOT NULL DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS knowledge_base_files jsonb DEFAULT '[]'::jsonb;

-- Create storage bucket for agent knowledge base files
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-knowledge-base', 'agent-knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload KB files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-knowledge-base');

CREATE POLICY "Authenticated users can read KB files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-knowledge-base');

CREATE POLICY "Authenticated users can delete KB files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-knowledge-base');
