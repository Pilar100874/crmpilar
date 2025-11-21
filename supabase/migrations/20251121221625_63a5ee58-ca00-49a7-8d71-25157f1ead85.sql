-- Criar tabela de logs de execução omnichannel
CREATE TABLE IF NOT EXISTS public.omnichannel_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.omnichannel_flows(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  block_label TEXT NOT NULL,
  block_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  customer_name TEXT,
  details TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_execution_logs_flow_id ON public.omnichannel_execution_logs(flow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_conversation_id ON public.omnichannel_execution_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON public.omnichannel_execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_flow_created ON public.omnichannel_execution_logs(flow_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.omnichannel_execution_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view execution logs from their establishment"
  ON public.omnichannel_execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.omnichannel_flows
      WHERE omnichannel_flows.id = omnichannel_execution_logs.flow_id
      AND omnichannel_flows.estabelecimento_id IN (
        SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert execution logs"
  ON public.omnichannel_execution_logs
  FOR INSERT
  WITH CHECK (true);

-- Habilitar realtime para logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.omnichannel_execution_logs;