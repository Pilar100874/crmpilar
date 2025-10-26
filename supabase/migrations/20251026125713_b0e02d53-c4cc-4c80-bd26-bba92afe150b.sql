-- Fix security definer functions to have proper search_path

-- Recreate get_user_estabelecimento_id with search_path
CREATE OR REPLACE FUNCTION public.get_user_estabelecimento_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT estabelecimento_id
  FROM public.usuarios
  WHERE id = _user_id
  LIMIT 1;
$$;

-- Recreate has_role with proper search_path (if not already set)
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

-- Recreate roles_present with proper search_path
CREATE OR REPLACE FUNCTION public.roles_present()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles)
$$;

-- Recreate admins_present with proper search_path
CREATE OR REPLACE FUNCTION public.admins_present()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.administradores)
$$;