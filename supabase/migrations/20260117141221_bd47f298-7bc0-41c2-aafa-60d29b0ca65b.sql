-- Tabela para armazenar os prospects encontrados
CREATE TABLE public.prospects_b2b (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  endereco_completo TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  telefone TEXT,
  website TEXT,
  rating DECIMAL(2, 1),
  total_avaliacoes INTEGER,
  horario_funcionamento JSONB,
  google_maps_link TEXT,
  fonte_dados TEXT DEFAULT 'google_places',
  status_lead TEXT DEFAULT 'novo' CHECK (status_lead IN ('novo', 'contatado', 'qualificado', 'nao_interessado', 'cliente')),
  palavra_chave_busca TEXT,
  area_busca JSONB,
  busca_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, place_id)
);

-- Tabela para controlar buscas e gastos com API
CREATE TABLE public.prospects_b2b_buscas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  palavra_chave TEXT NOT NULL,
  area_poligono JSONB NOT NULL,
  bounding_box JSONB,
  total_resultados INTEGER DEFAULT 0,
  chamadas_api INTEGER DEFAULT 0,
  custo_estimado DECIMAL(10, 4) DEFAULT 0,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida', 'cancelada', 'erro')),
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para configuração de limites de gastos
CREATE TABLE public.prospects_b2b_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE UNIQUE,
  limite_resultados_por_busca INTEGER DEFAULT 100,
  limite_custo_por_busca DECIMAL(10, 2) DEFAULT 10.00,
  limite_custo_mensal DECIMAL(10, 2) DEFAULT 100.00,
  api_provider TEXT DEFAULT 'google_places',
  custo_por_chamada DECIMAL(10, 4) DEFAULT 0.017,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para log de consumo de API (monitoramento detalhado)
CREATE TABLE public.prospects_b2b_api_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  busca_id UUID REFERENCES public.prospects_b2b_buscas(id) ON DELETE CASCADE,
  tipo_chamada TEXT NOT NULL,
  endpoint TEXT,
  parametros JSONB,
  resposta_status INTEGER,
  resultados_retornados INTEGER DEFAULT 0,
  custo_chamada DECIMAL(10, 4) DEFAULT 0,
  tempo_resposta_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prospects_b2b ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects_b2b_buscas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects_b2b_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects_b2b_api_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prospects_b2b
CREATE POLICY "Users can view their establishment prospects"
ON public.prospects_b2b FOR SELECT
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert prospects for their establishment"
ON public.prospects_b2b FOR INSERT
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their establishment prospects"
ON public.prospects_b2b FOR UPDATE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can delete their establishment prospects"
ON public.prospects_b2b FOR DELETE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- RLS Policies for prospects_b2b_buscas
CREATE POLICY "Users can view their establishment searches"
ON public.prospects_b2b_buscas FOR SELECT
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert searches for their establishment"
ON public.prospects_b2b_buscas FOR INSERT
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their establishment searches"
ON public.prospects_b2b_buscas FOR UPDATE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- RLS Policies for prospects_b2b_config
CREATE POLICY "Users can view their establishment config"
ON public.prospects_b2b_config FOR SELECT
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert config for their establishment"
ON public.prospects_b2b_config FOR INSERT
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can update their establishment config"
ON public.prospects_b2b_config FOR UPDATE
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- RLS Policies for prospects_b2b_api_log
CREATE POLICY "Users can view their establishment api logs"
ON public.prospects_b2b_api_log FOR SELECT
USING (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Users can insert api logs for their establishment"
ON public.prospects_b2b_api_log FOR INSERT
WITH CHECK (estabelecimento_id IN (
  SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_prospects_b2b_updated_at
BEFORE UPDATE ON public.prospects_b2b
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_b2b_buscas_updated_at
BEFORE UPDATE ON public.prospects_b2b_buscas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_b2b_config_updated_at
BEFORE UPDATE ON public.prospects_b2b_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_prospects_b2b_estabelecimento ON public.prospects_b2b(estabelecimento_id);
CREATE INDEX idx_prospects_b2b_status ON public.prospects_b2b(status_lead);
CREATE INDEX idx_prospects_b2b_busca ON public.prospects_b2b(busca_id);
CREATE INDEX idx_prospects_b2b_buscas_estabelecimento ON public.prospects_b2b_buscas(estabelecimento_id);
CREATE INDEX idx_prospects_b2b_api_log_busca ON public.prospects_b2b_api_log(busca_id);
CREATE INDEX idx_prospects_b2b_api_log_created ON public.prospects_b2b_api_log(created_at);