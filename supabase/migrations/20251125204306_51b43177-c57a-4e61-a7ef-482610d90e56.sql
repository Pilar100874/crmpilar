-- Criar tabela para armazenar automações de vendas
CREATE TABLE IF NOT EXISTS public.automacoes_vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  flow_data JSONB NOT NULL,
  prioridade INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_automacoes_vendas_estabelecimento
    FOREIGN KEY (estabelecimento_id)
    REFERENCES public.estabelecimentos(id)
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_automacoes_vendas_estabelecimento ON public.automacoes_vendas(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_vendas_ativo ON public.automacoes_vendas(ativo);

-- RLS Policies
ALTER TABLE public.automacoes_vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar automações de seu estabelecimento"
  ON public.automacoes_vendas FOR SELECT
  USING (
    estabelecimento_id = (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem criar automações em seu estabelecimento"
  ON public.automacoes_vendas FOR INSERT
  WITH CHECK (
    estabelecimento_id = (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar automações de seu estabelecimento"
  ON public.automacoes_vendas FOR UPDATE
  USING (
    estabelecimento_id = (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Usuários podem deletar automações de seu estabelecimento"
  ON public.automacoes_vendas FOR DELETE
  USING (
    estabelecimento_id = (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_automacoes_vendas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_automacoes_vendas_updated_at
  BEFORE UPDATE ON public.automacoes_vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_automacoes_vendas_updated_at();

-- Criar tabela para log de execução das automações
CREATE TABLE IF NOT EXISTS public.automacoes_vendas_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automacao_id UUID NOT NULL,
  orcamento_id UUID NOT NULL,
  regra_aplicada TEXT NOT NULL,
  valor_desconto DECIMAL(10, 2),
  percentual_desconto DECIMAL(5, 2),
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_automacoes_vendas_log_automacao
    FOREIGN KEY (automacao_id)
    REFERENCES public.automacoes_vendas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_automacoes_vendas_log_orcamento
    FOREIGN KEY (orcamento_id)
    REFERENCES public.orcamentos(id)
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_automacoes_vendas_log_automacao ON public.automacoes_vendas_log(automacao_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_vendas_log_orcamento ON public.automacoes_vendas_log(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_automacoes_vendas_log_created_at ON public.automacoes_vendas_log(created_at);

-- RLS Policies para log
ALTER TABLE public.automacoes_vendas_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar logs de automações de seu estabelecimento"
  ON public.automacoes_vendas_log FOR SELECT
  USING (
    automacao_id IN (
      SELECT id FROM public.automacoes_vendas
      WHERE estabelecimento_id = (
        SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
      )
    )
    OR
    EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid())
  );

CREATE POLICY "Sistema pode inserir logs de automações"
  ON public.automacoes_vendas_log FOR INSERT
  WITH CHECK (true);