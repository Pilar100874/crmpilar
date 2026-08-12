REVOKE ALL ON FUNCTION public.ponto_user_empresa_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ponto_user_funcionario_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ponto_user_empresa_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ponto_user_funcionario_ids() TO authenticated, service_role;