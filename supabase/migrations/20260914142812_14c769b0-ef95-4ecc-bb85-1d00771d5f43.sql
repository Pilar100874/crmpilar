REVOKE ALL ON FUNCTION public.vincular_dispositivo_app() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_dispositivo_app() TO service_role;
REVOKE ALL ON FUNCTION public.validar_comando_atualizacao_app() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_comando_atualizacao_app() TO service_role;