
-- =========================================================
-- 1) ORCAMENTOS: remove header-token RLS, add secure RPC
-- =========================================================
DROP POLICY IF EXISTS "Public access orcamentos via explicit token" ON public.orcamentos;
DROP POLICY IF EXISTS "Public access orcamento_itens via explicit token" ON public.orcamento_itens;

CREATE OR REPLACE FUNCTION public.lookup_orcamento_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(o)
         || jsonb_build_object(
              'cliente', (SELECT to_jsonb(c) FROM customers c WHERE c.id = o.cliente_id),
              'vendedor', (SELECT jsonb_build_object('nome', u.nome, 'email', u.email) FROM usuarios u WHERE u.id = o.vendedor_id),
              'itens', COALESCE((
                SELECT jsonb_agg(to_jsonb(i) || jsonb_build_object(
                         'produto', (SELECT jsonb_build_object('nome', pr.nome, 'foto_url', pr.foto_url) FROM produtos pr WHERE pr.id = i.produto_id)
                       ))
                FROM orcamento_itens i WHERE i.orcamento_id = o.id
              ), '[]'::jsonb)
            )
    INTO v_result
  FROM orcamentos o
  WHERE o.token_compartilhamento IS NOT NULL
    AND o.token_compartilhamento = p_token;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_orcamento_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_orcamento_by_token(text) TO anon, authenticated, service_role;

-- =========================================================
-- 2) PEDIDO TRACKING HISTORICO: remove header-token RLS
-- =========================================================
DROP POLICY IF EXISTS "Public view historico by token" ON public.pedido_tracking_historico;

CREATE OR REPLACE FUNCTION public.lookup_pedido_historico_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT pt.id INTO v_pedido_id
  FROM pedido_tracking pt
  WHERE pt.token_rastreamento = p_token;

  IF v_pedido_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.created_at), '[]'::jsonb)
    INTO v_result
  FROM pedido_tracking_historico h
  WHERE h.pedido_tracking_id = v_pedido_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_pedido_historico_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_historico_by_token(text) TO anon, authenticated, service_role;

-- =========================================================
-- 3) PEDIDOS ECOMMERCE: remove header-token RLS, add RPCs
-- =========================================================
DROP POLICY IF EXISTS "Public read pedidos_ecommerce by token" ON public.pedidos_ecommerce;
DROP POLICY IF EXISTS "Public read pedidos_ecommerce_itens by token" ON public.pedidos_ecommerce_itens;

CREATE OR REPLACE FUNCTION public.lookup_pedido_ecommerce_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(p) || jsonb_build_object(
           'itens', COALESCE((
             SELECT jsonb_agg(to_jsonb(i)) FROM pedidos_ecommerce_itens i WHERE i.pedido_id = p.id
           ), '[]'::jsonb)
         )
    INTO v_result
  FROM pedidos_ecommerce p
  WHERE p.token_rastreamento = p_token;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_pedido_ecommerce_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_by_token(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lookup_pedidos_ecommerce_by_tokens(p_tokens text[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_tokens IS NULL OR array_length(p_tokens, 1) IS NULL OR array_length(p_tokens, 1) > 50 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC), '[]'::jsonb)
    INTO v_result
  FROM pedidos_ecommerce p
  WHERE p.token_rastreamento = ANY(p_tokens)
    AND length(p.token_rastreamento) >= 8;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_pedidos_ecommerce_by_tokens(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pedidos_ecommerce_by_tokens(text[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lookup_pedido_ecommerce_itens_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    INTO v_result
  FROM pedidos_ecommerce_itens i
  JOIN pedidos_ecommerce p ON p.id = i.pedido_id
  WHERE p.token_rastreamento = p_token;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_pedido_ecommerce_itens_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_ecommerce_itens_by_token(text) TO anon, authenticated, service_role;

-- =========================================================
-- 4) PROFILES: centralized SECURITY DEFINER admin check
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_profile_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_profile_admin(auth.uid()))
  WITH CHECK (public.is_profile_admin(auth.uid()));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin IS NOT DISTINCT FROM public.is_profile_admin(auth.uid()));

-- =========================================================
-- 5) PROSPECCAO_EMPRESAS: tenant scoping
-- =========================================================
ALTER TABLE public.prospeccao_empresas
  ADD COLUMN IF NOT EXISTS estabelecimento_id uuid;

UPDATE public.prospeccao_empresas pe
SET estabelecimento_id = u.estabelecimento_id
FROM public.usuarios u
WHERE pe.estabelecimento_id IS NULL
  AND (u.auth_user_id = pe.user_id OR u.id = pe.user_id);

ALTER TABLE public.prospeccao_empresas
  ALTER COLUMN estabelecimento_id SET DEFAULT public.get_auth_user_estabelecimento_id();

CREATE INDEX IF NOT EXISTS idx_prospeccao_empresas_estabelecimento
  ON public.prospeccao_empresas (estabelecimento_id);

DROP POLICY IF EXISTS "prospeccao_empresas_owner_all" ON public.prospeccao_empresas;

CREATE POLICY "prospeccao_empresas_tenant_all"
  ON public.prospeccao_empresas FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    OR (estabelecimento_id IS NOT NULL AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (estabelecimento_id IS NOT NULL AND estabelecimento_id = public.get_auth_user_estabelecimento_id())
  );

-- =========================================================
-- 6) ECOMMERCE_DENUNCIAS: validation + basic rate limiting
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_ecommerce_denuncia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent integer;
BEGIN
  IF NEW.descricao IS NULL OR length(trim(NEW.descricao)) < 10 THEN
    RAISE EXCEPTION 'Descrição muito curta (mínimo 10 caracteres).';
  END IF;
  IF length(NEW.descricao) > 5000 THEN
    RAISE EXCEPTION 'Descrição muito longa (máximo 5000 caracteres).';
  END IF;
  IF NEW.categoria IS NOT NULL AND length(NEW.categoria) > 100 THEN
    RAISE EXCEPTION 'Categoria inválida.';
  END IF;
  IF NEW.nome IS NOT NULL AND length(NEW.nome) > 150 THEN
    RAISE EXCEPTION 'Nome muito longo.';
  END IF;
  IF NEW.local_ocorrencia IS NOT NULL AND length(NEW.local_ocorrencia) > 300 THEN
    RAISE EXCEPTION 'Local muito longo.';
  END IF;
  IF NEW.telefone IS NOT NULL AND length(NEW.telefone) > 30 THEN
    RAISE EXCEPTION 'Telefone inválido.';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    IF length(NEW.email) > 255 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'E-mail inválido.';
    END IF;
  END IF;

  -- Anti-flood: máximo de 20 denúncias por hora por estabelecimento
  SELECT count(*) INTO v_recent
  FROM public.ecommerce_denuncias d
  WHERE d.estabelecimento_id IS NOT DISTINCT FROM NEW.estabelecimento_id
    AND d.created_at > now() - interval '1 hour';

  IF v_recent >= 20 THEN
    RAISE EXCEPTION 'Muitas denúncias enviadas recentemente. Tente novamente mais tarde.';
  END IF;

  -- Anti-flood por e-mail informado: máximo de 3 por hora
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    SELECT count(*) INTO v_recent
    FROM public.ecommerce_denuncias d
    WHERE d.email = NEW.email
      AND d.created_at > now() - interval '1 hour';

    IF v_recent >= 3 THEN
      RAISE EXCEPTION 'Muitas denúncias enviadas com este e-mail. Tente novamente mais tarde.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ecommerce_denuncia ON public.ecommerce_denuncias;
CREATE TRIGGER trg_validate_ecommerce_denuncia
  BEFORE INSERT ON public.ecommerce_denuncias
  FOR EACH ROW EXECUTE FUNCTION public.validate_ecommerce_denuncia();
