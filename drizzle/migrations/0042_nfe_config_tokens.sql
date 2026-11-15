CREATE TABLE public.nfe_config (
  estabelecimento_id uuid PRIMARY KEY,
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  token_homologacao text,
  token_producao text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.nfe_config TO service_role;
ALTER TABLE public.nfe_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.nfe_config_status()
RETURNS TABLE(ambiente text, tem_token_homologacao boolean, tem_token_producao boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.ambiente, c.token_homologacao IS NOT NULL, c.token_producao IS NOT NULL, c.updated_at
  FROM public.nfe_config c
  WHERE public.is_usuario_interno(auth.uid()) AND c.estabelecimento_id = public.get_auth_user_estabelecimento_id()
$$;

CREATE OR REPLACE FUNCTION public.nfe_config_salvar(p_ambiente text, p_token_homologacao text, p_token_producao text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_est uuid := public.get_auth_user_estabelecimento_id();
BEGIN
  IF NOT public.is_usuario_interno(auth.uid()) OR v_est IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_ambiente NOT IN ('homologacao','producao') THEN RAISE EXCEPTION 'Ambiente inválido'; END IF;
  INSERT INTO public.nfe_config (estabelecimento_id, ambiente, token_homologacao, token_producao)
  VALUES (v_est, p_ambiente, NULLIF(trim(p_token_homologacao),''), NULLIF(trim(p_token_producao),''))
  ON CONFLICT (estabelecimento_id) DO UPDATE SET
    ambiente = EXCLUDED.ambiente,
    token_homologacao = COALESCE(NULLIF(trim(p_token_homologacao),''), nfe_config.token_homologacao),
    token_producao = COALESCE(NULLIF(trim(p_token_producao),''), nfe_config.token_producao),
    updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.nfe_config_status(), public.nfe_config_salvar(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nfe_config_status(), public.nfe_config_salvar(text,text,text) TO authenticated;