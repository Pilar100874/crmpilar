-- Criar tabela para relatórios customizados
CREATE TABLE IF NOT EXISTS public.relatorios_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'geral', 'atendente', 'fila', 'canal'
  metricas TEXT[] NOT NULL, -- Array de métricas selecionadas
  filtros JSONB, -- Filtros aplicados (período, fila_id, atendente_id, canal)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_relatorios_customizados_estabelecimento 
  ON public.relatorios_customizados(estabelecimento_id);

CREATE INDEX IF NOT EXISTS idx_relatorios_customizados_tipo 
  ON public.relatorios_customizados(tipo);

-- RLS Policies
ALTER TABLE public.relatorios_customizados ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver relatórios de seu estabelecimento
CREATE POLICY "Usuários podem ver relatórios de seu estabelecimento"
  ON public.relatorios_customizados
  FOR SELECT
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Policy: Usuários podem criar relatórios em seu estabelecimento
CREATE POLICY "Usuários podem criar relatórios em seu estabelecimento"
  ON public.relatorios_customizados
  FOR INSERT
  WITH CHECK (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Policy: Usuários podem atualizar relatórios de seu estabelecimento
CREATE POLICY "Usuários podem atualizar relatórios de seu estabelecimento"
  ON public.relatorios_customizados
  FOR UPDATE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Policy: Usuários podem deletar relatórios de seu estabelecimento
CREATE POLICY "Usuários podem deletar relatórios de seu estabelecimento"
  ON public.relatorios_customizados
  FOR DELETE
  USING (
    estabelecimento_id = get_user_estabelecimento_id(auth.uid())
    OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_relatorios_customizados_updated_at
  BEFORE UPDATE ON public.relatorios_customizados
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_customizados_updated_at();

-- Função para o trigger
CREATE OR REPLACE FUNCTION update_relatorios_customizados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;