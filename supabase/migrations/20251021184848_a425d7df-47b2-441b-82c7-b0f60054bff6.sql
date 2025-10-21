-- Remover policies antigas completamente
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can manage database connections" ON database_connections;
  DROP POLICY IF EXISTS "Users can manage database connections" ON database_connections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and gestores can manage api endpoints" ON api_endpoints;
  DROP POLICY IF EXISTS "Users can manage api endpoints" ON api_endpoints;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Recriar policies com lógica correta
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

-- Ajustar outras tabelas
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage grupos_acesso" ON grupos_acesso;
  DROP POLICY IF EXISTS "Users can manage grupos_acesso" ON grupos_acesso;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage unidades" ON unidades;
  DROP POLICY IF EXISTS "Users can manage unidades" ON unidades;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage segmentos" ON segmentos;
  DROP POLICY IF EXISTS "Users can manage segmentos" ON segmentos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage usuarios" ON usuarios;
  DROP POLICY IF EXISTS "Users can manage usuarios" ON usuarios;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can manage usuario_segmentos" ON usuario_segmentos;
  DROP POLICY IF EXISTS "Users can manage usuario_segmentos" ON usuario_segmentos;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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