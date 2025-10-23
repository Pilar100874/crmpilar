-- Secure admin login function to bypass RLS safely
CREATE OR REPLACE FUNCTION public.admin_login(cpf_input text, password_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM public.administradores
  WHERE cpf = cpf_input AND senha_hash = password_input
  LIMIT 1;

  RETURN admin_id;
END;
$$;

-- Restrict function access and allow anon/authenticated to execute
REVOKE ALL ON FUNCTION public.admin_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon, authenticated;