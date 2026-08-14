REVOKE EXECUTE ON FUNCTION public.admin_login(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admins_present() FROM anon;
REVOKE EXECUTE ON FUNCTION public.roles_present() FROM anon;