CREATE OR REPLACE FUNCTION public.get_telefonia_estabelecimento()
RETURNS TABLE(
  servidor text,
  porta integer,
  servidor_alternativo text,
  porta_alternativa integer,
  ramal_portaria text,
  ativo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.ucm_host::text,
         c.sip_porta,
         c.remote_ip::text,
         c.sip_porta_alternativa,
         c.ramal_portaria,
         c.enabled
  FROM public.ucm_config c
  WHERE c.estabelecimento_id = (
    SELECT u.estabelecimento_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid() LIMIT 1
  )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_telefonia_estabelecimento() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_telefonia_estabelecimento() TO authenticated;