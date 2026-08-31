REVOKE EXECUTE ON FUNCTION public.set_unidade_atual() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_minha_unidade_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_acessar_unidade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_minha_unidade_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_acessar_unidade(uuid) TO authenticated;