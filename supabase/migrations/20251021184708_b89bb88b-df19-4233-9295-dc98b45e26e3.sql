-- Ajustar policy de database_connections para incluir WITH CHECK explicitamente
DROP POLICY IF EXISTS "Admins and gestores can manage database connections" ON database_connections;

-- Criar policy que permite acesso a usuários autenticados OU com role admin/gestor
CREATE POLICY "Users can manage database connections"
  ON database_connections
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

-- Aplicar mesma lógica para api_endpoints
DROP POLICY IF EXISTS "Admins and gestores can manage api endpoints" ON api_endpoints;

CREATE POLICY "Users can manage api endpoints"
  ON api_endpoints
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

-- Ajustar outras tabelas de configuração também
DROP POLICY IF EXISTS "Authenticated users can manage grupos_acesso" ON grupos_acesso;

CREATE POLICY "Users can manage grupos_acesso"
  ON grupos_acesso
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage unidades" ON unidades;

CREATE POLICY "Users can manage unidades"
  ON unidades
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage segmentos" ON segmentos;

CREATE POLICY "Users can manage segmentos"
  ON segmentos
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage usuarios" ON usuarios;

CREATE POLICY "Users can manage usuarios"
  ON usuarios
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can manage usuario_segmentos" ON usuario_segmentos;

CREATE POLICY "Users can manage usuario_segmentos"
  ON usuario_segmentos
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1)
    )
  );