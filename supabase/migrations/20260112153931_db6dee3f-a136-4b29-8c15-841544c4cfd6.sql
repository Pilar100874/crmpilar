-- Tabela para renda média por município (dados IBGE)
CREATE TABLE IF NOT EXISTS public.municipios_renda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  codigo_ibge TEXT,
  renda_media NUMERIC,
  renda_mediana NUMERIC,
  pib_per_capita NUMERIC,
  idh NUMERIC,
  populacao INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice único para upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipios_renda_unique 
ON public.municipios_renda(municipio, uf);

-- Tabela para isócronas salvas
CREATE TABLE IF NOT EXISTS public.isocronas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  tempo_minutos INTEGER NOT NULL DEFAULT 15,
  modo_transporte TEXT NOT NULL DEFAULT 'driving-car',
  geometria_geojson JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.municipios_renda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isocronas ENABLE ROW LEVEL SECURITY;

-- Políticas para municipios_renda (dados públicos, todos podem ler)
CREATE POLICY "Qualquer um pode ler municipios_renda" 
ON public.municipios_renda 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem inserir municipios_renda" 
ON public.municipios_renda 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar municipios_renda" 
ON public.municipios_renda 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Políticas para isocronas
CREATE POLICY "Qualquer um pode ler isocronas" 
ON public.isocronas 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem gerenciar isocronas" 
ON public.isocronas 
FOR ALL 
USING (auth.uid() IS NOT NULL);