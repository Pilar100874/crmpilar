-- Tabela para armazenar dados de empresas importados do arquivo (Receita Federal/Brasil.io)
CREATE TABLE public.empresas_cnae_municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnae VARCHAR(10) NOT NULL,
  cnae_descricao TEXT,
  uf VARCHAR(2) NOT NULL,
  municipio VARCHAR(255) NOT NULL,
  codigo_municipio VARCHAR(10),
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id)
);

-- Índices para busca rápida
CREATE INDEX idx_empresas_cnae_municipios_cnae ON public.empresas_cnae_municipios(cnae);
CREATE INDEX idx_empresas_cnae_municipios_uf ON public.empresas_cnae_municipios(uf);
CREATE INDEX idx_empresas_cnae_municipios_municipio ON public.empresas_cnae_municipios(municipio);
CREATE INDEX idx_empresas_cnae_municipios_estab ON public.empresas_cnae_municipios(estabelecimento_id);

-- Coordenadas dos municípios para o mapa de calor
CREATE TABLE public.municipios_coordenadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_ibge VARCHAR(10) UNIQUE,
  nome VARCHAR(255) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  populacao INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_municipios_nome_uf ON public.municipios_coordenadas(nome, uf);

-- Enable RLS
ALTER TABLE public.empresas_cnae_municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios_coordenadas ENABLE ROW LEVEL SECURITY;

-- Policies - dados de leitura pública para visualização no mapa
CREATE POLICY "Leitura pública de empresas_cnae_municipios" 
ON public.empresas_cnae_municipios 
FOR SELECT 
USING (true);

CREATE POLICY "Insert empresas_cnae_municipios autenticado" 
ON public.empresas_cnae_municipios 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update empresas_cnae_municipios autenticado" 
ON public.empresas_cnae_municipios 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Delete empresas_cnae_municipios autenticado" 
ON public.empresas_cnae_municipios 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Leitura pública de municipios_coordenadas" 
ON public.municipios_coordenadas 
FOR SELECT 
USING (true);

CREATE POLICY "Insert municipios_coordenadas autenticado" 
ON public.municipios_coordenadas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_empresas_cnae_municipios_updated_at
BEFORE UPDATE ON public.empresas_cnae_municipios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();