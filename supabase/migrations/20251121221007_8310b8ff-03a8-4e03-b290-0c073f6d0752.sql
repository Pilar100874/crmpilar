-- Criar tabela de versões de fluxo omnichannel
CREATE TABLE IF NOT EXISTS public.omnichannel_flow_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.omnichannel_flows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  flow_data JSONB NOT NULL,
  change_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE(flow_id, version_number)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_flow_versions_flow_id ON public.omnichannel_flow_versions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_created_at ON public.omnichannel_flow_versions(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.omnichannel_flow_versions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view flow versions from their establishment"
  ON public.omnichannel_flow_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.omnichannel_flows
      WHERE omnichannel_flows.id = omnichannel_flow_versions.flow_id
      AND omnichannel_flows.estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create flow versions for their establishment"
  ON public.omnichannel_flow_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.omnichannel_flows
      WHERE omnichannel_flows.id = omnichannel_flow_versions.flow_id
      AND omnichannel_flows.estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
    )
  );