-- Tabela para configurar fontes de dados de licitações
CREATE TABLE IF NOT EXISTS public.licitacoes_fontes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  fonte TEXT NOT NULL, -- pncp, compras_gov, dados_abertos_sp, alerta_licitacao, portal_dados_abertos
  nome_display TEXT NOT NULL,
  ativo BOOLEAN DEFAULT false,
  api_key TEXT, -- Para fontes que requerem API key (ex: Alerta Licitação)
  config JSONB DEFAULT '{}', -- Configurações específicas da fonte
  ultima_sincronizacao TIMESTAMPTZ,
  total_importados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(estabelecimento_id, fonte)
);

-- Índice para busca por estabelecimento
CREATE INDEX IF NOT EXISTS idx_licitacoes_fontes_estabelecimento ON public.licitacoes_fontes(estabelecimento_id);

-- RLS
ALTER TABLE public.licitacoes_fontes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver fontes do seu estabelecimento"
ON public.licitacoes_fontes FOR SELECT
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem inserir fontes do seu estabelecimento"
ON public.licitacoes_fontes FOR INSERT
WITH CHECK (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem atualizar fontes do seu estabelecimento"
ON public.licitacoes_fontes FOR UPDATE
USING (user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Usuários podem deletar fontes do seu estabelecimento"
ON public.licitacoes_fontes FOR DELETE
USING (user_in_estabelecimento(estabelecimento_id));

-- Trigger para updated_at
CREATE TRIGGER update_licitacoes_fontes_updated_at
  BEFORE UPDATE ON public.licitacoes_fontes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna source_details na tabela de oportunidades para dados extras da fonte
ALTER TABLE public.licitacoes_opportunities 
ADD COLUMN IF NOT EXISTS source_details JSONB DEFAULT '{}';

-- Adicionar coluna para controle de itens específicos
ALTER TABLE public.licitacoes_opportunities 
ADD COLUMN IF NOT EXISTS itens_licitacao JSONB DEFAULT '[]';