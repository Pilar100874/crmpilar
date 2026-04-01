
ALTER TABLE public.chat_agents 
  ADD COLUMN IF NOT EXISTS tipo_agente text NOT NULL DEFAULT 'especifico',
  ADD COLUMN IF NOT EXISTS sub_agent_ids text[] DEFAULT '{}';
