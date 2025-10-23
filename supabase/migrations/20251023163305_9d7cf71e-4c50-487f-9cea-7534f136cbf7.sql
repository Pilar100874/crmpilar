-- Ajustar constraints para permitir nomes duplicados em estabelecimentos diferentes

-- UNIDADES: Permitir mesmo nome em estabelecimentos diferentes
ALTER TABLE public.unidades DROP CONSTRAINT IF EXISTS unidades_nome_unique;
CREATE UNIQUE INDEX unidades_nome_estabelecimento_unique 
ON public.unidades (estabelecimento_id, LOWER(nome));

-- SEGMENTOS: Permitir mesmo nome em estabelecimentos diferentes
ALTER TABLE public.segmentos DROP CONSTRAINT IF EXISTS segmentos_nome_unique;
CREATE UNIQUE INDEX segmentos_nome_estabelecimento_unique 
ON public.segmentos (estabelecimento_id, LOWER(nome));

-- GRUPOS_ACESSO: Permitir mesmo nome em estabelecimentos diferentes
ALTER TABLE public.grupos_acesso DROP CONSTRAINT IF EXISTS grupos_acesso_nome_unique;
CREATE UNIQUE INDEX grupos_acesso_nome_estabelecimento_unique 
ON public.grupos_acesso (estabelecimento_id, LOWER(nome));

-- USUARIOS: Email único por estabelecimento (não globalmente)
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_email_unique;
CREATE UNIQUE INDEX usuarios_email_estabelecimento_unique 
ON public.usuarios (estabelecimento_id, LOWER(email));

-- CUSTOMERS: Permitir mesmo cliente em estabelecimentos diferentes
-- Email único por estabelecimento
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_unique;
CREATE UNIQUE INDEX customers_email_estabelecimento_unique 
ON public.customers (estabelecimento_id, LOWER(email)) WHERE estabelecimento_id IS NOT NULL;

-- Telefone único por estabelecimento
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_telefone_unique;
CREATE UNIQUE INDEX customers_telefone_estabelecimento_unique 
ON public.customers (estabelecimento_id, telefone) WHERE estabelecimento_id IS NOT NULL;

-- Nome único por estabelecimento
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_nome_unique;
CREATE UNIQUE INDEX customers_nome_estabelecimento_unique 
ON public.customers (estabelecimento_id, LOWER(nome)) WHERE estabelecimento_id IS NOT NULL;