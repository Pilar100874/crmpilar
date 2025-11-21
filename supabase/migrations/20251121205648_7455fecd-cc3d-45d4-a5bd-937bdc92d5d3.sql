-- Criar tabela para armazenar os fluxos visuais do omnichannel
CREATE TABLE IF NOT EXISTS public.omnichannel_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_omnichannel_flows_estabelecimento ON public.omnichannel_flows(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_omnichannel_flows_ativo ON public.omnichannel_flows(ativo);

-- RLS Policies
ALTER TABLE public.omnichannel_flows ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: usuários autenticados veem flows de seu estabelecimento ou admins veem tudo
CREATE POLICY "Usuarios autenticados podem ver flows de seu estabelecimento"
  ON public.omnichannel_flows
  FOR SELECT
  TO authenticated
  USING (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE id = auth.uid()
    )
  );

-- Policy para INSERT: admin ou gestor podem criar
CREATE POLICY "Admin ou gestor podem criar flows"
  ON public.omnichannel_flows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE id = auth.uid()
    )
  );

-- Policy para UPDATE: admin ou gestor podem atualizar
CREATE POLICY "Admin ou gestor podem atualizar flows"
  ON public.omnichannel_flows
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE id = auth.uid()
    )
  );

-- Policy para DELETE: admin ou gestor podem deletar
CREATE POLICY "Admin ou gestor podem deletar flows"
  ON public.omnichannel_flows
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'gestor')
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_omnichannel_flows_updated_at
  BEFORE UPDATE ON public.omnichannel_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();