-- Criar tabela para webhooks de entrada
CREATE TABLE IF NOT EXISTS public.webhooks_entrada (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  url_gerada TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  metodo TEXT NOT NULL DEFAULT 'POST',
  aceita_json BOOLEAN NOT NULL DEFAULT true,
  aceita_form_data BOOLEAN NOT NULL DEFAULT true,
  acao_tipo TEXT NOT NULL, -- 'automacao_marketing', 'url_customizada'
  automacao_id UUID, -- referência para automações de marketing (caso exista tabela)
  url_customizada TEXT, -- URL customizada para chamar quando webhook for acionado
  ultimo_trigger TIMESTAMP WITH TIME ZONE,
  total_triggers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhooks_entrada ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver webhooks de seu estabelecimento"
  ON public.webhooks_entrada
  FOR SELECT
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar webhooks para seu estabelecimento"
  ON public.webhooks_entrada
  FOR INSERT
  WITH CHECK (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem atualizar webhooks de seu estabelecimento"
  ON public.webhooks_entrada
  FOR UPDATE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem deletar webhooks de seu estabelecimento"
  ON public.webhooks_entrada
  FOR DELETE
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_webhooks_entrada_updated_at
  BEFORE UPDATE ON public.webhooks_entrada
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices
CREATE INDEX idx_webhooks_entrada_estabelecimento ON public.webhooks_entrada(estabelecimento_id);
CREATE INDEX idx_webhooks_entrada_url ON public.webhooks_entrada(url_gerada);
CREATE INDEX idx_webhooks_entrada_ativo ON public.webhooks_entrada(ativo);