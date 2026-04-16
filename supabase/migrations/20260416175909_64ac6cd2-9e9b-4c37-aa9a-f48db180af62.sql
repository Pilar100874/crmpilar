ALTER TABLE public.chat_agents
  ADD COLUMN IF NOT EXISTS regra_mesclagem text,
  ADD COLUMN IF NOT EXISTS regra_mesclagem_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS regra_sugestao_proativa text,
  ADD COLUMN IF NOT EXISTS regra_sugestao_ativa boolean NOT NULL DEFAULT true;