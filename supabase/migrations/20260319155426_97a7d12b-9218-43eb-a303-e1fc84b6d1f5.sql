CREATE TABLE public.strategy_custom_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🤖',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 100,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, agent_key)
);

ALTER TABLE public.strategy_custom_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom agents of their estabelecimento"
ON public.strategy_custom_agents FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can insert custom agents for their estabelecimento"
ON public.strategy_custom_agents FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can update custom agents of their estabelecimento"
ON public.strategy_custom_agents FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Users can delete custom agents of their estabelecimento"
ON public.strategy_custom_agents FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());