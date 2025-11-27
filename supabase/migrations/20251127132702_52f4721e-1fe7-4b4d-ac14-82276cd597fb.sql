-- Tabela para preços de combustíveis
CREATE TABLE public.combustiveis_precos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  preco_diesel NUMERIC(10,4) DEFAULT 0,
  preco_etanol NUMERIC(10,4) DEFAULT 0,
  preco_gasolina NUMERIC(10,4) DEFAULT 0,
  preco_eletrico NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT combustiveis_precos_estabelecimento_unique UNIQUE (estabelecimento_id)
);

-- Tabela para custos por tipo de veículo
CREATE TABLE public.veiculos_custos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  tipo_veiculo VARCHAR(50) NOT NULL,
  tipo_combustivel VARCHAR(20) NOT NULL DEFAULT 'diesel',
  consumo_cidade NUMERIC(10,2) DEFAULT 0,
  consumo_estrada NUMERIC(10,2) DEFAULT 0,
  custo_manutencao_mensal NUMERIC(12,2) DEFAULT 0,
  custo_funcionario_mensal NUMERIC(12,2) DEFAULT 0,
  valor_ajudante NUMERIC(12,2) DEFAULT 0,
  valor_refeicao NUMERIC(12,2) DEFAULT 0,
  extras NUMERIC(12,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT veiculos_custos_unique UNIQUE (estabelecimento_id, tipo_veiculo)
);

-- Enable RLS
ALTER TABLE public.combustiveis_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos_custos ENABLE ROW LEVEL SECURITY;

-- Policies para combustiveis_precos
CREATE POLICY "Users can view fuel prices for their establishment"
ON public.combustiveis_precos FOR SELECT
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can insert fuel prices for their establishment"
ON public.combustiveis_precos FOR INSERT
WITH CHECK (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can update fuel prices for their establishment"
ON public.combustiveis_precos FOR UPDATE
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can delete fuel prices for their establishment"
ON public.combustiveis_precos FOR DELETE
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

-- Policies para veiculos_custos
CREATE POLICY "Users can view vehicle costs for their establishment"
ON public.veiculos_custos FOR SELECT
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can insert vehicle costs for their establishment"
ON public.veiculos_custos FOR INSERT
WITH CHECK (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can update vehicle costs for their establishment"
ON public.veiculos_custos FOR UPDATE
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

CREATE POLICY "Users can delete vehicle costs for their establishment"
ON public.veiculos_custos FOR DELETE
USING (
  (estabelecimento_id IN (SELECT usuarios.estabelecimento_id FROM usuarios WHERE usuarios.auth_user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
);

-- Triggers para updated_at
CREATE TRIGGER update_combustiveis_precos_updated_at
BEFORE UPDATE ON public.combustiveis_precos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_veiculos_custos_updated_at
BEFORE UPDATE ON public.veiculos_custos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();