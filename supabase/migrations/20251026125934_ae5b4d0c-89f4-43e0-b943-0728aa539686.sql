-- Fix remaining security definer functions to have proper search_path

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix check_user_limit
CREATE OR REPLACE FUNCTION public.check_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_count INTEGER;
  max_users INTEGER;
BEGIN
  -- Get current user count and max allowed for the estabelecimento
  SELECT COUNT(*), e.numero_usuarios_permitidos
  INTO current_count, max_users
  FROM public.usuarios u
  JOIN public.estabelecimentos e ON e.id = NEW.estabelecimento_id
  WHERE u.estabelecimento_id = NEW.estabelecimento_id
  GROUP BY e.numero_usuarios_permitidos;
  
  -- If no users exist yet, get the max from estabelecimentos
  IF current_count IS NULL THEN
    SELECT numero_usuarios_permitidos INTO max_users
    FROM public.estabelecimentos
    WHERE id = NEW.estabelecimento_id;
    current_count := 0;
  END IF;
  
  -- Check if limit is reached
  IF current_count >= max_users THEN
    RAISE EXCEPTION 'Limite de usuários atingido para este estabelecimento (máximo: %)', max_users;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix admin_login
CREATE OR REPLACE FUNCTION public.admin_login(cpf_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM public.administradores
  WHERE cpf = cpf_input AND senha_hash = password_input
  LIMIT 1;

  RETURN admin_id;
END;
$function$;

-- Fix update_funil_updated_at
CREATE OR REPLACE FUNCTION public.update_funil_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_emails_updated_at
CREATE OR REPLACE FUNCTION public.update_emails_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_global_variables_updated_at
CREATE OR REPLACE FUNCTION public.update_global_variables_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;