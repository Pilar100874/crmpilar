
-- 1) Function search_path
CREATE OR REPLACE FUNCTION public.visita_haversine_metros(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 2 * 6371000 * asin(
    sqrt(
      sin(radians((lat2 - lat1) / 2)) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) *
      sin(radians((lng2 - lng1) / 2)) ^ 2
    )
  );
$$;

-- 2) ecommerce_denuncias
DROP POLICY IF EXISTS "Autenticados podem visualizar denúncias" ON public.ecommerce_denuncias;
DROP POLICY IF EXISTS "Autenticados podem atualizar denúncias" ON public.ecommerce_denuncias;
DROP POLICY IF EXISTS "Autenticados podem excluir denúncias" ON public.ecommerce_denuncias;

CREATE POLICY "Admins/gestores veem denuncias do seu estabelecimento"
ON public.ecommerce_denuncias FOR SELECT TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
);
CREATE POLICY "Admins/gestores atualizam denuncias do seu estabelecimento"
ON public.ecommerce_denuncias FOR UPDATE TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Admins/gestores excluem denuncias do seu estabelecimento"
ON public.ecommerce_denuncias FOR DELETE TO authenticated
USING (
  estabelecimento_id = public.get_auth_user_estabelecimento_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
);

-- 3) mcp_tabelas_expostas: admin-only
DROP POLICY IF EXISTS "auth delete mcp tabelas" ON public.mcp_tabelas_expostas;
DROP POLICY IF EXISTS "auth insert mcp tabelas" ON public.mcp_tabelas_expostas;
DROP POLICY IF EXISTS "auth read mcp tabelas" ON public.mcp_tabelas_expostas;
DROP POLICY IF EXISTS "auth update mcp tabelas" ON public.mcp_tabelas_expostas;

CREATE POLICY "Admins gerenciam mcp_tabelas_expostas"
ON public.mcp_tabelas_expostas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Drop broad policies
DO $$
DECLARE t text; p text;
  tables text[] := ARRAY['campaigns','video_projects','contents','flows','quick_replies','quick_attachments','unidades','segmentos','grupos_acesso','canais_atendimento','notificacoes_config','seguranca_config','redes_sociais','webhooks'];
  polnames text[] := ARRAY[
    'campaigns_auth_all','video_projects_auth_all','Allow all for authenticated',
    'contents_auth_all','flows_auth_all','quick_replies_auth_all','quick_attachments_auth_all',
    'unidades_auth_all','segmentos_auth_all','grupos_acesso_auth_all','canais_atendimento_auth_all',
    'notificacoes_config_auth_all','seguranca_config_auth_all','redes_sociais_auth_all','webhooks_auth_all',
    'Simple policy for canais_atendimento','Simple policy for grupos_acesso',
    'Simple policy for notificacoes_config','Simple policy for quick_attachments',
    'Simple policy for quick_replies','Simple policy for redes_sociais',
    'Simple policy for segmentos','Simple policy for seguranca_config',
    'Simple policy for unidades','Simple policy for webhooks'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOREACH p IN ARRAY polnames LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- Scoped policies for uuid tables
DO $$
DECLARE t text;
  tables text[] := ARRAY['campaigns','contents','flows','quick_replies','quick_attachments','unidades','segmentos','grupos_acesso','canais_atendimento','notificacoes_config','seguranca_config','redes_sociais','webhooks'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id()) WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id())',
      t || '_tenant_scope', t
    );
  END LOOP;
END $$;

-- video_projects has text estabelecimento_id
CREATE POLICY "video_projects_tenant_scope" ON public.video_projects
FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id()::text)
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id()::text);

-- 5) orcamentos
DROP POLICY IF EXISTS "Allow authenticated users to manage orcamentos" ON public.orcamentos;
CREATE POLICY "Orcamentos por estabelecimento"
ON public.orcamentos FOR ALL TO authenticated
USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- 6) produtos and pricing
DROP POLICY IF EXISTS "DEV: Allow all for authenticated" ON public.produtos;
DROP POLICY IF EXISTS "DEV: Allow all for authenticated" ON public.produto_categorias;
DROP POLICY IF EXISTS "DEV: Allow all for authenticated" ON public.produto_grupos;
DROP POLICY IF EXISTS "DEV: Allow all for authenticated" ON public.tipos_pagamento;
DROP POLICY IF EXISTS "DEV: Allow all for authenticated" ON public.condicoes_pagamento;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['produtos','produto_categorias','produto_grupos','tipos_pagamento','condicoes_pagamento'] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (estabelecimento_id = public.get_auth_user_estabelecimento_id()) WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id())',
      t || '_tenant_scope', t
    );
  END LOOP;
END $$;

-- 7) push_subscriptions ownership
DROP POLICY IF EXISTS "Insert push subscription" ON public.push_subscriptions;
CREATE POLICY "Insert push subscription owned"
ON public.push_subscriptions FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  OR (contato_id IS NOT NULL)
);

-- 8) usuarios bootstrap policy removal
DROP POLICY IF EXISTS "Allow operations during initialization" ON public.usuarios;
