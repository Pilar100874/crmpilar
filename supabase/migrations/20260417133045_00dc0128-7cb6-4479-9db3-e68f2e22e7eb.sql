-- Tabela de lacunas da base de conhecimento
CREATE TABLE public.kb_lacunas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.chat_agents(id) ON DELETE SET NULL,
  agent_nome TEXT,
  session_id UUID,
  pergunta TEXT NOT NULL,
  contexto JSONB,
  motivo TEXT NOT NULL DEFAULT 'fallback', -- 'fallback' | 'score_baixo'
  score_kb NUMERIC,
  resposta_sugerida TEXT,
  resposta_editada TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovada' | 'ignorada'
  kb_id_criada UUID REFERENCES public.agent_knowledge_bases(id) ON DELETE SET NULL,
  aprovada_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  aprovada_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_lacunas_estab ON public.kb_lacunas(estabelecimento_id);
CREATE INDEX idx_kb_lacunas_status ON public.kb_lacunas(status);
CREATE INDEX idx_kb_lacunas_agent ON public.kb_lacunas(agent_id);
CREATE INDEX idx_kb_lacunas_created ON public.kb_lacunas(created_at DESC);

-- Evita duplicatas exatas pendentes da mesma pergunta no mesmo agente
CREATE UNIQUE INDEX idx_kb_lacunas_unique_pendente
  ON public.kb_lacunas(estabelecimento_id, agent_id, lower(pergunta))
  WHERE status = 'pendente';

ALTER TABLE public.kb_lacunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem lacunas do próprio estabelecimento"
ON public.kb_lacunas FOR SELECT
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Service e usuários podem inserir lacunas do estabelecimento"
ON public.kb_lacunas FOR INSERT
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários podem atualizar lacunas do estabelecimento"
ON public.kb_lacunas FOR UPDATE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE POLICY "Usuários podem deletar lacunas do estabelecimento"
ON public.kb_lacunas FOR DELETE
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER update_kb_lacunas_updated_at
BEFORE UPDATE ON public.kb_lacunas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();