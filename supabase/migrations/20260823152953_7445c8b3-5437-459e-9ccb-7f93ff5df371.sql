CREATE OR REPLACE FUNCTION public.port_is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'))
    OR NOT EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id)
  )
$function$;

CREATE OR REPLACE FUNCTION public.port_is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','porteiro'))
    OR NOT EXISTS (SELECT 1 FROM public.port_user_roles WHERE user_id = _user_id)
  )
$function$;