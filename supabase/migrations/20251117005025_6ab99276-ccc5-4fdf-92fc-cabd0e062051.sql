-- Create calls table
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  call_id TEXT,
  numero_origem TEXT,
  numero_destino TEXT,
  ramal TEXT,
  status TEXT NOT NULL DEFAULT 'ringing',
  direcao TEXT NOT NULL,
  horario_inicio TIMESTAMP WITH TIME ZONE DEFAULT now(),
  horario_atendimento TIMESTAMP WITH TIME ZONE,
  horario_fim TIMESTAMP WITH TIME ZONE,
  duracao_segundos INTEGER,
  recording_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policy for viewing (same establishment)
CREATE POLICY "Users can view their establishment calls"
ON public.calls
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Policy for inserting (same establishment)
CREATE POLICY "Users can insert calls for their establishment"
ON public.calls
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Policy for updating (same establishment)
CREATE POLICY "Users can update calls for their establishment"
ON public.calls
FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Policy for deleting (same establishment)
CREATE POLICY "Users can delete calls for their establishment"
ON public.calls
FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR NOT roles_present()
);

-- Trigger for updated_at
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;