
-- ============ CATEGORIAS ============
CREATE TABLE public.doc_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  cor text DEFAULT '#3b82f6',
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_categorias TO authenticated;
GRANT ALL ON public.doc_categorias TO service_role;
ALTER TABLE public.doc_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_categorias estab" ON public.doc_categorias FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE TRIGGER doc_categorias_updated_at BEFORE UPDATE ON public.doc_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MODELOS ============
CREATE TABLE public.doc_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  categoria_id uuid REFERENCES public.doc_categorias(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  content_html text DEFAULT '',
  content_json jsonb DEFAULT '{}'::jsonb,
  header_html text DEFAULT '',
  footer_html text DEFAULT '',
  page_size text DEFAULT 'A4',
  ativo boolean NOT NULL DEFAULT true,
  versao_atual int NOT NULL DEFAULT 1,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_modelos TO authenticated;
GRANT ALL ON public.doc_modelos TO service_role;
ALTER TABLE public.doc_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_modelos estab" ON public.doc_modelos FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX doc_modelos_estab_idx ON public.doc_modelos(estabelecimento_id);
CREATE INDEX doc_modelos_cat_idx ON public.doc_modelos(categoria_id);
CREATE TRIGGER doc_modelos_updated_at BEFORE UPDATE ON public.doc_modelos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VERSÕES ============
CREATE TABLE public.doc_modelo_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.doc_modelos(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  versao int NOT NULL,
  content_html text,
  content_json jsonb,
  header_html text,
  footer_html text,
  criado_por uuid,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_modelo_versoes TO authenticated;
GRANT ALL ON public.doc_modelo_versoes TO service_role;
ALTER TABLE public.doc_modelo_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_modelo_versoes estab" ON public.doc_modelo_versoes FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX doc_versoes_modelo_idx ON public.doc_modelo_versoes(modelo_id, versao DESC);

-- ============ CAMPOS ============
CREATE TABLE public.doc_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  chave text NOT NULL,
  rotulo text NOT NULL,
  categoria text DEFAULT 'geral',
  tipo text NOT NULL DEFAULT 'texto', -- texto, data, moeda, booleano, numero
  descricao text,
  origem_tabela text,
  origem_coluna text,
  formato text,
  personalizado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_campos TO authenticated;
GRANT ALL ON public.doc_campos TO service_role;
ALTER TABLE public.doc_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_campos estab" ON public.doc_campos FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE TRIGGER doc_campos_updated_at BEFORE UPDATE ON public.doc_campos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOCUMENTOS GERADOS ============
CREATE TABLE public.doc_gerados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  modelo_id uuid REFERENCES public.doc_modelos(id) ON DELETE SET NULL,
  modelo_versao int,
  registro_tipo text,           -- cliente, fornecedor, funcionario, pedido, orcamento, contrato, atendimento, livre
  registro_id text,
  titulo text NOT NULL,
  numero_documento text,
  content_html_final text NOT NULL DEFAULT '',
  dados_merge jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'gerado',  -- rascunho, gerado, enviado, assinado, cancelado
  gerado_por uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_gerados TO authenticated;
GRANT ALL ON public.doc_gerados TO service_role;
ALTER TABLE public.doc_gerados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_gerados estab" ON public.doc_gerados FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE INDEX doc_gerados_estab_idx ON public.doc_gerados(estabelecimento_id);
CREATE INDEX doc_gerados_modelo_idx ON public.doc_gerados(modelo_id);
CREATE INDEX doc_gerados_registro_idx ON public.doc_gerados(registro_tipo, registro_id);
CREATE TRIGGER doc_gerados_updated_at BEFORE UPDATE ON public.doc_gerados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PERMISSÕES ============
CREATE TABLE public.doc_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  pode_criar_modelo boolean NOT NULL DEFAULT true,
  pode_editar_modelo boolean NOT NULL DEFAULT true,
  pode_excluir_modelo boolean NOT NULL DEFAULT true,
  pode_gerar boolean NOT NULL DEFAULT true,
  pode_ver_gerados boolean NOT NULL DEFAULT true,
  pode_ver_historico boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_permissoes TO authenticated;
GRANT ALL ON public.doc_permissoes TO service_role;
ALTER TABLE public.doc_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_permissoes estab" ON public.doc_permissoes FOR ALL TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE TRIGGER doc_permissoes_updated_at BEFORE UPDATE ON public.doc_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED CAMPOS DO SISTEMA ============
INSERT INTO public.doc_campos (estabelecimento_id, chave, rotulo, categoria, tipo, origem_tabela, origem_coluna)
SELECT e.id, s.chave, s.rotulo, s.categoria, s.tipo, s.origem_tabela, s.origem_coluna
FROM public.estabelecimentos e
CROSS JOIN (VALUES
  ('nome_cliente',      'Nome do cliente',      'Cliente',  'texto',    'customers', 'nome'),
  ('cpf_cnpj',          'CPF/CNPJ',             'Cliente',  'texto',    'customers', 'cpf_cnpj'),
  ('endereco',          'Endereço',             'Cliente',  'texto',    'customers', 'endereco'),
  ('telefone',          'Telefone',             'Cliente',  'texto',    'customers', 'telefone'),
  ('email',             'E-mail',               'Cliente',  'texto',    'customers', 'email'),
  ('data_atual',        'Data atual',           'Sistema',  'data',     NULL,        NULL),
  ('valor',             'Valor',                'Comercial','moeda',    NULL,        NULL),
  ('descricao',         'Descrição',            'Comercial','texto',    NULL,        NULL),
  ('nome_empresa',      'Nome da empresa',      'Empresa',  'texto',    'empresas',  'nome_fantasia'),
  ('responsavel',       'Responsável',          'Empresa',  'texto',    NULL,        NULL),
  ('numero_contrato',   'Número do contrato',   'Contrato', 'texto',    NULL,        NULL),
  ('data_vencimento',   'Data de vencimento',   'Contrato', 'data',     NULL,        NULL)
) AS s(chave, rotulo, categoria, tipo, origem_tabela, origem_coluna)
ON CONFLICT (estabelecimento_id, chave) DO NOTHING;
