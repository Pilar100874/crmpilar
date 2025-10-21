-- Criar tabela de conexões de banco de dados
CREATE TABLE IF NOT EXISTS public.database_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  database_type TEXT NOT NULL,
  sql_server TEXT NOT NULL,
  sql_database TEXT NOT NULL,
  sql_username TEXT NOT NULL,
  sql_password TEXT NOT NULL,
  sql_port TEXT DEFAULT '1433',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de endpoints de API
CREATE TABLE IF NOT EXISTS public.api_endpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  database_type TEXT NOT NULL,
  sql_server TEXT,
  sql_database TEXT,
  sql_username TEXT,
  sql_password TEXT,
  query TEXT NOT NULL,
  http_method TEXT NOT NULL,
  endpoint_path TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '[]',
  connection_id UUID REFERENCES database_connections(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para database_connections
CREATE POLICY "Admins and gestores can manage database connections"
  ON public.database_connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Authenticated users can view database connections"
  ON public.database_connections
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para api_endpoints
CREATE POLICY "Admins and gestores can manage api endpoints"
  ON public.api_endpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'gestor')
    )
  );

CREATE POLICY "Authenticated users can view api endpoints"
  ON public.api_endpoints
  FOR SELECT
  USING (auth.uid() IS NOT NULL);