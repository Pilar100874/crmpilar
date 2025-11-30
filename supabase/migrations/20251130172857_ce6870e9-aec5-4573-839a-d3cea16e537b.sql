-- Tabela para armazenar marcadores de parada no mapa
CREATE TABLE public.logistica_paradas_marcadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  tempo_parado_minutos INTEGER NOT NULL,
  categoria_tempo VARCHAR(20) NOT NULL CHECK (categoria_tempo IN ('10_20', '21_30', 'mais_30')),
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE,
  ativa BOOLEAN NOT NULL DEFAULT true,
  automacao_id UUID REFERENCES public.logistica_automacoes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_paradas_marcadas_veiculo ON public.logistica_paradas_marcadas(veiculo_id);
CREATE INDEX idx_paradas_marcadas_estabelecimento ON public.logistica_paradas_marcadas(estabelecimento_id);
CREATE INDEX idx_paradas_marcadas_ativa ON public.logistica_paradas_marcadas(ativa);
CREATE INDEX idx_paradas_marcadas_data ON public.logistica_paradas_marcadas(data_inicio, data_fim);

-- Enable RLS
ALTER TABLE public.logistica_paradas_marcadas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view paradas from their establishment"
ON public.logistica_paradas_marcadas
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert paradas for their establishment"
ON public.logistica_paradas_marcadas
FOR INSERT
TO authenticated
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update paradas from their establishment"
ON public.logistica_paradas_marcadas
FOR UPDATE
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios 
    WHERE auth_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.logistica_paradas_marcadas;