-- Fix infinite recursion by creating security definer function
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

-- Update api_endpoints policies to use the function
DROP POLICY IF EXISTS "Admins and gestores can manage api endpoints" ON api_endpoints;
CREATE POLICY "Admins and gestores can manage api endpoints"
  ON api_endpoints FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );

-- Update database_connections policies to use the function
DROP POLICY IF EXISTS "Admins and gestores can manage database connections" ON database_connections;
CREATE POLICY "Admins and gestores can manage database connections"
  ON database_connections FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
  );