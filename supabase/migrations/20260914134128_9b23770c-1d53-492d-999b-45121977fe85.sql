REVOKE ALL ON FUNCTION public.vincular_dispositivo_controle() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vincular_dispositivo_controle() FROM anon;
REVOKE ALL ON FUNCTION public.vincular_dispositivo_controle() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_dispositivo_controle() TO service_role;