-- 1) Remover leituras públicas amplas
DROP POLICY IF EXISTS "Public can view active ads" ON public.ecommerce_anuncios;
DROP POLICY IF EXISTS "Public can view ecommerce config" ON public.ecommerce_config;
DROP POLICY IF EXISTS "Public can view active content" ON public.ecommerce_conteudos;
DROP POLICY IF EXISTS "Public can view active volume pricing" ON public.ecommerce_volume_pricing;
DROP POLICY IF EXISTS "Anon can read active presentations for TV playback" ON public.apresentacoes_empresa;

-- 2) Garantir leitura escopada para usuários logados
CREATE POLICY "Config da propria empresa" ON public.ecommerce_config
  FOR SELECT TO authenticated
  USING (public.user_in_estabelecimento(estabelecimento_id));

CREATE POLICY "Precos por volume da propria empresa" ON public.ecommerce_volume_pricing
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

REVOKE SELECT ON public.ecommerce_anuncios FROM anon;
REVOKE SELECT ON public.ecommerce_config FROM anon;
REVOKE SELECT ON public.ecommerce_conteudos FROM anon;
REVOKE SELECT ON public.ecommerce_volume_pricing FROM anon;
REVOKE SELECT ON public.apresentacoes_empresa FROM anon;

-- 3) Consultas públicas escopadas por empresa
CREATE OR REPLACE FUNCTION public.loja_config_publica(p_estabelecimento_id uuid DEFAULT NULL)
RETURNS SETOF public.ecommerce_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ecommerce_config c
  WHERE (p_estabelecimento_id IS NULL OR c.estabelecimento_id = p_estabelecimento_id)
  ORDER BY c.updated_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.loja_anuncios_publicos(p_estabelecimento_id uuid, p_posicao text DEFAULT NULL)
RETURNS SETOF public.ecommerce_anuncios
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ecommerce_anuncios a
  WHERE a.ativo = true
    AND a.estabelecimento_id = p_estabelecimento_id
    AND (p_posicao IS NULL OR a.posicao = p_posicao)
  ORDER BY a.ordem
$$;

CREATE OR REPLACE FUNCTION public.loja_conteudo_publico(p_estabelecimento_id uuid, p_tipo text)
RETURNS SETOF public.ecommerce_conteudos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ecommerce_conteudos c
  WHERE c.ativo = true
    AND c.tipo = p_tipo
    AND c.estabelecimento_id = p_estabelecimento_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.loja_volume_pricing_publico(p_estabelecimento_id uuid)
RETURNS SETOF public.ecommerce_volume_pricing
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.ecommerce_volume_pricing v
  WHERE v.ativo = true
    AND v.estabelecimento_id = p_estabelecimento_id
  ORDER BY v.ordem
$$;

CREATE OR REPLACE FUNCTION public.apresentacao_tv_publica(p_id uuid)
RETURNS SETOF public.apresentacoes_empresa
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.apresentacoes_empresa a
  WHERE a.ativo = true
    AND a.id = p_id
$$;

GRANT EXECUTE ON FUNCTION public.loja_config_publica(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loja_anuncios_publicos(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loja_conteudo_publico(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loja_volume_pricing_publico(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apresentacao_tv_publica(uuid) TO anon, authenticated;