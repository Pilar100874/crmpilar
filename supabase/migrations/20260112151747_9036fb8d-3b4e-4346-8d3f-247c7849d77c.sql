-- Adiciona constraint única para permitir upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_cnae_municipios_unique 
ON public.empresas_cnae_municipios(cnae, uf, municipio);

-- Adiciona constraint única para municipios_coordenadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipios_coordenadas_nome_uf 
ON public.municipios_coordenadas(nome, uf);