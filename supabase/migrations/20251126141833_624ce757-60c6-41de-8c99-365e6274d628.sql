-- Criar tabela de configuração de IA por estabelecimento
CREATE TABLE IF NOT EXISTS public.ia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  contexto TEXT NOT NULL, -- 'suggest_response', 'summarize', 'translate', 'sentiment', 'kb_articles', 'default'
  provider TEXT NOT NULL DEFAULT 'lovable', -- 'lovable', 'openai', 'anthropic', 'google'
  model TEXT, -- nome do modelo específico
  api_key TEXT, -- chave API (se não for Lovable)
  ativo BOOLEAN DEFAULT true,
  configuracoes JSONB DEFAULT '{}'::jsonb, -- configurações extras como temperature, max_tokens, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estabelecimento_id, contexto)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ia_config_estabelecimento ON public.ia_config(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_ia_config_contexto ON public.ia_config(contexto);
CREATE INDEX IF NOT EXISTS idx_ia_config_ativo ON public.ia_config(ativo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ia_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ia_config_updated_at
  BEFORE UPDATE ON public.ia_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ia_config_updated_at();

-- RLS Policies
ALTER TABLE public.ia_config ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem visualizar configurações do seu estabelecimento
CREATE POLICY "Usuários podem visualizar configurações de IA do seu estabelecimento"
  ON public.ia_config
  FOR SELECT
  TO authenticated
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Apenas admins do estabelecimento ou admins de sistema podem inserir
CREATE POLICY "Apenas admins podem criar configurações de IA"
  ON public.ia_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Apenas admins do estabelecimento ou admins de sistema podem atualizar
CREATE POLICY "Apenas admins podem atualizar configurações de IA"
  ON public.ia_config
  FOR UPDATE
  TO authenticated
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Apenas admins do estabelecimento ou admins de sistema podem deletar
CREATE POLICY "Apenas admins podem deletar configurações de IA"
  ON public.ia_config
  FOR DELETE
  TO authenticated
  USING (
    (estabelecimento_id = get_user_estabelecimento_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

COMMENT ON TABLE public.ia_config IS 'Configurações de IA por estabelecimento e contexto de uso';
COMMENT ON COLUMN public.ia_config.contexto IS 'Contexto onde a IA será usada: suggest_response, summarize, translate, sentiment, kb_articles, default';
COMMENT ON COLUMN public.ia_config.provider IS 'Provedor de IA: lovable (padrão), openai, anthropic, google';
COMMENT ON COLUMN public.ia_config.api_key IS 'Chave API do provedor (não necessária para Lovable)';