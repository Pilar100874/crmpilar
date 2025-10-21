-- 1) Ensure secure role-checking function (avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2) Helper to check if roles table has any row, bypassing RLS
CREATE OR REPLACE FUNCTION public.roles_present()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles)
$$;

-- 3) Fix recursive policies on user_roles
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
  DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Admins manage all roles (no recursion via SECURITY DEFINER)
CREATE POLICY "Admins can manage all roles"
  ON user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles; admins can view all
CREATE POLICY "Users can view their own roles"
  ON user_roles
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4) Recreate policies for API generator resources using roles_present() to avoid selecting user_roles in policy
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage database connections" ON database_connections;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage database connections"
  ON database_connections
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT public.roles_present()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT public.roles_present()
    )
  );

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage api endpoints" ON api_endpoints;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can manage api endpoints"
  ON api_endpoints
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT public.roles_present()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'gestor') OR
      NOT public.roles_present()
    )
  );