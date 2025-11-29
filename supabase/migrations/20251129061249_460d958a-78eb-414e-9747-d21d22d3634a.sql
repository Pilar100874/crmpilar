-- Tabela de veículos
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  descricao TEXT,
  motorista VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  tipo_veiculo VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de posições (rastreamento)
CREATE TABLE public.veiculo_posicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  velocidade DOUBLE PRECISION DEFAULT 0,
  direcao DOUBLE PRECISION,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de rotas salvas
CREATE TABLE public.rotas_salvas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  coordenadas_json JSONB NOT NULL,
  pontos_parada JSONB,
  distancia_metros DOUBLE PRECISION,
  tempo_estimado_segundos INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de entregas/paradas programadas
CREATE TABLE public.entregas_programadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rota_id UUID REFERENCES public.rotas_salvas(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  endereco TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ordem INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pendente',
  hora_prevista TIMESTAMP WITH TIME ZONE,
  hora_chegada TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_veiculo_posicoes_veiculo_id ON public.veiculo_posicoes(veiculo_id);
CREATE INDEX idx_veiculo_posicoes_data_hora ON public.veiculo_posicoes(data_hora DESC);
CREATE INDEX idx_veiculos_estabelecimento ON public.veiculos(estabelecimento_id);
CREATE INDEX idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX idx_rotas_salvas_estabelecimento ON public.rotas_salvas(estabelecimento_id);
CREATE INDEX idx_entregas_rota ON public.entregas_programadas(rota_id);

-- Enable RLS
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculo_posicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas_salvas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_programadas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para veiculos
CREATE POLICY "Veículos visíveis por estabelecimento ou admin" 
ON public.veiculos FOR SELECT 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Criar veículos no próprio estabelecimento" 
ON public.veiculos FOR INSERT 
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Atualizar veículos do próprio estabelecimento" 
ON public.veiculos FOR UPDATE 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Deletar veículos do próprio estabelecimento" 
ON public.veiculos FOR DELETE 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies para posições (acesso via veículo)
CREATE POLICY "Posições visíveis via veículo do estabelecimento" 
ON public.veiculo_posicoes FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM veiculos v 
    WHERE v.id = veiculo_id 
    AND (v.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Inserir posições de veículos do estabelecimento" 
ON public.veiculo_posicoes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM veiculos v 
    WHERE v.id = veiculo_id 
    AND (v.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

-- RLS Policies para rotas salvas
CREATE POLICY "Rotas visíveis por estabelecimento ou admin" 
ON public.rotas_salvas FOR SELECT 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Criar rotas no próprio estabelecimento" 
ON public.rotas_salvas FOR INSERT 
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Atualizar rotas do próprio estabelecimento" 
ON public.rotas_salvas FOR UPDATE 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Deletar rotas do próprio estabelecimento" 
ON public.rotas_salvas FOR DELETE 
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies para entregas
CREATE POLICY "Entregas visíveis via rota do estabelecimento" 
ON public.entregas_programadas FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM rotas_salvas r 
    WHERE r.id = rota_id 
    AND (r.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Criar entregas em rotas do estabelecimento" 
ON public.entregas_programadas FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rotas_salvas r 
    WHERE r.id = rota_id 
    AND (r.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Atualizar entregas de rotas do estabelecimento" 
ON public.entregas_programadas FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM rotas_salvas r 
    WHERE r.id = rota_id 
    AND (r.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

CREATE POLICY "Deletar entregas de rotas do estabelecimento" 
ON public.entregas_programadas FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM rotas_salvas r 
    WHERE r.id = rota_id 
    AND (r.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
         OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_veiculos_updated_at
BEFORE UPDATE ON public.veiculos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rotas_salvas_updated_at
BEFORE UPDATE ON public.rotas_salvas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entregas_updated_at
BEFORE UPDATE ON public.entregas_programadas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime para posições
ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculo_posicoes;