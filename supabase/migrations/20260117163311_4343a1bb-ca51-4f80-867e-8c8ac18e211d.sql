-- Tabela para armazenar CNPJs importados da base de dados abertos
CREATE TABLE public.cnpj_base_local (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  cnpj VARCHAR(18) NOT NULL,
  cnpj_basico VARCHAR(8),
  razao_social TEXT,
  nome_fantasia TEXT,
  situacao_cadastral VARCHAR(50),
  data_situacao_cadastral DATE,
  natureza_juridica VARCHAR(10),
  cnae_fiscal VARCHAR(10),
  cnae_fiscal_descricao TEXT,
  logradouro TEXT,
  numero VARCHAR(20),
  complemento TEXT,
  bairro TEXT,
  cep VARCHAR(10),
  uf VARCHAR(2),
  municipio TEXT,
  codigo_municipio VARCHAR(10),
  telefone1 VARCHAR(20),
  telefone2 VARCHAR(20),
  email TEXT,
  capital_social DECIMAL(15,2),
  porte_empresa VARCHAR(2),
  data_inicio_atividade DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, cnpj)
);

-- Índices para buscas eficientes
CREATE INDEX idx_cnpj_base_local_estab ON public.cnpj_base_local(estabelecimento_id);
CREATE INDEX idx_cnpj_base_local_cnpj ON public.cnpj_base_local(cnpj);
CREATE INDEX idx_cnpj_base_local_uf ON public.cnpj_base_local(estabelecimento_id, uf);
CREATE INDEX idx_cnpj_base_local_municipio ON public.cnpj_base_local(estabelecimento_id, uf, municipio);
CREATE INDEX idx_cnpj_base_local_cnae ON public.cnpj_base_local(estabelecimento_id, cnae_fiscal);
CREATE INDEX idx_cnpj_base_local_situacao ON public.cnpj_base_local(estabelecimento_id, situacao_cadastral);

-- Enable RLS
ALTER TABLE public.cnpj_base_local ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver CNPJs do seu estabelecimento" 
ON public.cnpj_base_local 
FOR SELECT 
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem inserir CNPJs no seu estabelecimento" 
ON public.cnpj_base_local 
FOR INSERT 
WITH CHECK (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar CNPJs do seu estabelecimento" 
ON public.cnpj_base_local 
FOR DELETE 
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

-- Tabela para controle de importações
CREATE TABLE public.cnpj_importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo VARCHAR(20) NOT NULL,
  total_registros INTEGER DEFAULT 0,
  registros_importados INTEGER DEFAULT 0,
  registros_ignorados INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente',
  erro_mensagem TEXT,
  filtros_aplicados JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cnpj_importacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para importações
CREATE POLICY "Usuários podem ver importações do seu estabelecimento" 
ON public.cnpj_importacoes 
FOR SELECT 
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar importações no seu estabelecimento" 
ON public.cnpj_importacoes 
FOR INSERT 
WITH CHECK (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar importações do seu estabelecimento" 
ON public.cnpj_importacoes 
FOR UPDATE 
USING (
  estabelecimento_id IN (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
  )
);