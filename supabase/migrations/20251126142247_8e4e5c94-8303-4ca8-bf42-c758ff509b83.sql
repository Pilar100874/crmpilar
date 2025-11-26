-- Criar tabela de log de uso de IA
CREATE TABLE IF NOT EXISTS public.ia_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  contexto TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  custo_estimado NUMERIC(10, 6) DEFAULT 0,
  duracao_ms INTEGER,
  sucesso BOOLEAN DEFAULT true,
  erro_mensagem TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_ia_usage_log_estabelecimento ON public.ia_usage_log(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_ia_usage_log_created_at ON public.ia_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_usage_log_contexto ON public.ia_usage_log(contexto);
CREATE INDEX IF NOT EXISTS idx_ia_usage_log_provider ON public.ia_usage_log(provider);

-- RLS Policies
ALTER TABLE public.ia_usage_log ENABLE ROW LEVEL SECURITY;

-- Sistema pode inserir logs
CREATE POLICY "Sistema pode criar logs de uso de IA"
  ON public.ia_usage_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários podem visualizar logs do seu estabelecimento
CREATE POLICY "Usuários podem visualizar logs do seu estabelecimento"
  ON public.ia_usage_log
  FOR SELECT
  TO authenticated
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Admins podem deletar logs antigos
CREATE POLICY "Admins podem deletar logs"
  ON public.ia_usage_log
  FOR DELETE
  TO authenticated
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

COMMENT ON TABLE public.ia_usage_log IS 'Log de todas as chamadas de IA realizadas no sistema';
COMMENT ON COLUMN public.ia_usage_log.custo_estimado IS 'Custo estimado da chamada em USD baseado no pricing do provider';