CREATE TABLE public.systax_config (
  estabelecimento_id uuid PRIMARY KEY,
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  url_api text,
  usuario text,
  token text,
  licenca text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.systax_config TO service_role;
ALTER TABLE public.systax_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.systax_config_status()
RETURNS TABLE(ambiente text, url_api text, usuario text, tem_token boolean, tem_licenca boolean, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.ambiente, c.url_api, c.usuario, c.token IS NOT NULL, c.licenca IS NOT NULL, c.updated_at
  FROM public.systax_config c
  WHERE public.is_usuario_interno(auth.uid()) AND c.estabelecimento_id = public.get_auth_user_estabelecimento_id()
$$;

CREATE OR REPLACE FUNCTION public.systax_config_salvar(p_ambiente text, p_url_api text, p_usuario text, p_token text, p_licenca text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_est uuid := public.get_auth_user_estabelecimento_id();
BEGIN
  IF NOT public.is_usuario_interno(auth.uid()) OR v_est IS NULL THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_ambiente NOT IN ('homologacao','producao') THEN RAISE EXCEPTION 'Ambiente inválido'; END IF;
  IF NULLIF(trim(p_url_api),'') IS NOT NULL AND trim(p_url_api) !~ '^https://' THEN RAISE EXCEPTION 'O endereço da API deve começar com https://'; END IF;
  INSERT INTO public.systax_config (estabelecimento_id, ambiente, url_api, usuario, token, licenca)
  VALUES (v_est, p_ambiente, NULLIF(trim(p_url_api),''), NULLIF(trim(p_usuario),''), NULLIF(trim(p_token),''), NULLIF(trim(p_licenca),''))
  ON CONFLICT (estabelecimento_id) DO UPDATE SET
    ambiente = EXCLUDED.ambiente,
    url_api = EXCLUDED.url_api,
    usuario = EXCLUDED.usuario,
    token = COALESCE(NULLIF(trim(p_token),''), systax_config.token),
    licenca = COALESCE(NULLIF(trim(p_licenca),''), systax_config.licenca),
    updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.systax_config_status(), public.systax_config_salvar(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.systax_config_status(), public.systax_config_salvar(text,text,text,text,text) TO authenticated;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS cest text,
  ADD COLUMN IF NOT EXISTS ex_tipi text,
  ADD COLUMN IF NOT EXISTS tipo_item_fiscal text,
  ADD COLUMN IF NOT EXISTS codigo_beneficio_fiscal text;
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS contribuinte_icms text,
  ADD COLUMN IF NOT EXISTS consumidor_final boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inscricao_suframa text,
  ADD COLUMN IF NOT EXISTS cnae_fiscal text;
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS cnae_fiscal text,
  ADD COLUMN IF NOT EXISTS crt text;

ALTER TABLE public.notas_fiscais_itens ADD COLUMN IF NOT EXISTS tributacao jsonb;

COMMENT ON TABLE public.regras_fiscais IS 'DEPRECATED: regras fiscais vêm do motor Systax (systax_config / função systax-calcular)';