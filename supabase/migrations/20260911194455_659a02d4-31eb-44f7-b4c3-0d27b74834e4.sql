-- F01: provisionamento com privilégio mínimo, executado no servidor.
CREATE OR REPLACE FUNCTION public.ferr_provision_current_user(p_email text, p_full_name text)
RETURNS public.ferr_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.ferr_profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão obrigatória';
  END IF;

  INSERT INTO public.ferr_profiles (id, email, full_name, is_approved, is_active, qr_code)
  VALUES (
    auth.uid(),
    left(coalesce(p_email, ''), 320),
    left(coalesce(nullif(btrim(p_full_name), ''), 'Usuário'), 200),
    false,
    true,
    gen_random_uuid()::text
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.ferr_user_roles (user_id, role)
  SELECT auth.uid(), 'usuario'::public.ferr_app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.ferr_user_roles WHERE user_id = auth.uid()
  );

  SELECT * INTO v_profile FROM public.ferr_profiles WHERE id = auth.uid();
  RETURN v_profile;
END;
$$;
REVOKE ALL ON FUNCTION public.ferr_provision_current_user(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ferr_provision_current_user(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "ferr_roles_self_bootstrap" ON public.ferr_user_roles;
CREATE POLICY "ferr_roles_self_bootstrap_usuario"
ON public.ferr_user_roles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'usuario'::public.ferr_app_role
  AND NOT EXISTS (SELECT 1 FROM public.ferr_user_roles r WHERE r.user_id = auth.uid())
);

-- Impede que uma atualização do próprio perfil altere campos de aprovação/empresa.
CREATE OR REPLACE FUNCTION public.ferr_protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND NOT public.ferr_is_admin(auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
     AND (
       NEW.company_id IS DISTINCT FROM OLD.company_id OR
       NEW.is_approved IS DISTINCT FROM OLD.is_approved OR
       NEW.is_active IS DISTINCT FROM OLD.is_active OR
       NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
       NEW.approved_by IS DISTINCT FROM OLD.approved_by
     ) THEN
    RAISE EXCEPTION 'Campos de aprovação e empresa exigem administrador';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ferr_profiles_protect_privileges ON public.ferr_profiles;
CREATE TRIGGER ferr_profiles_protect_privileges
BEFORE UPDATE ON public.ferr_profiles
FOR EACH ROW EXECUTE FUNCTION public.ferr_protect_profile_privileges();
REVOKE ALL ON FUNCTION public.ferr_protect_profile_privileges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ferr_protect_profile_privileges() TO service_role;

-- Escopo comum do módulo Ferramentas.
CREATE OR REPLACE FUNCTION public.ferr_can_access_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
    OR (
      target_company_id IS NOT NULL
      AND target_company_id = public.ferr_get_user_company_id(auth.uid())
    )
$$;
REVOKE ALL ON FUNCTION public.ferr_can_access_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ferr_can_access_company(uuid) TO authenticated, service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ferr_companies','ferr_profiles','ferr_user_roles','ferr_kits','ferr_tools','ferr_loans','ferr_loan_requests','ferr_notifications','ferr_return_issues','ferr_supply_groups','ferr_supplies','ferr_supply_movements','ferr_warehouses']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ferr_select_auth" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "ferr_write_auth" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "ferr_update_auth" ON public.%I', t);
  END LOOP;
END $$;

-- Perfis: o próprio usuário e administradores da mesma empresa.
CREATE POLICY "ferr_profiles_tenant_select" ON public.ferr_profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND company_id = public.ferr_get_user_company_id(auth.uid()))
);
CREATE POLICY "ferr_profiles_self_update" ON public.ferr_profiles
FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "ferr_profiles_tenant_admin_update" ON public.ferr_profiles
FOR UPDATE TO authenticated
USING (public.ferr_is_admin(auth.uid()) AND company_id = public.ferr_get_user_company_id(auth.uid()))
WITH CHECK (public.ferr_is_admin(auth.uid()) AND company_id = public.ferr_get_user_company_id(auth.uid()));

-- Papéis: leitura própria; administração somente dentro da empresa.
DROP POLICY IF EXISTS "ferr_select_auth" ON public.ferr_user_roles;
DROP POLICY IF EXISTS "ferr_roles_admin" ON public.ferr_user_roles;
CREATE POLICY "ferr_roles_self_or_tenant_admin_select" ON public.ferr_user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.ferr_profiles p
    WHERE p.id = ferr_user_roles.user_id
      AND p.company_id = public.ferr_get_user_company_id(auth.uid())
  ))
);
CREATE POLICY "ferr_roles_tenant_admin_manage" ON public.ferr_user_roles
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.ferr_profiles p
    WHERE p.id = ferr_user_roles.user_id
      AND p.company_id = public.ferr_get_user_company_id(auth.uid())
  ))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.ferr_profiles p
    WHERE p.id = ferr_user_roles.user_id
      AND p.company_id = public.ferr_get_user_company_id(auth.uid())
  ))
);

-- Tabelas que possuem company_id diretamente.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ferr_kits','ferr_tools','ferr_loans','ferr_loan_requests','ferr_notifications','ferr_return_issues','ferr_supply_groups','ferr_supplies','ferr_supply_movements','ferr_warehouses']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.ferr_can_access_company(company_id))', t || '_tenant_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.ferr_can_access_company(company_id))', t || '_tenant_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.ferr_can_access_company(company_id)) WITH CHECK (public.ferr_can_access_company(company_id))', t || '_tenant_update', t);
  END LOOP;
END $$;

-- A própria tabela de empresas usa id como chave do escopo.
CREATE POLICY "ferr_companies_tenant_select" ON public.ferr_companies
FOR SELECT TO authenticated USING (public.ferr_can_access_company(id));
CREATE POLICY "ferr_companies_system_insert" ON public.ferr_companies
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);
CREATE POLICY "ferr_companies_tenant_admin_update" ON public.ferr_companies
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND id = public.ferr_get_user_company_id(auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
  OR (public.ferr_is_admin(auth.uid()) AND id = public.ferr_get_user_company_id(auth.uid()))
);

-- F02: estabelecimento explícito em ambientes; regras herdam pelo ambiente.
ALTER TABLE public.automacao_ambientes ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
CREATE INDEX IF NOT EXISTS idx_automacao_ambientes_estabelecimento ON public.automacao_ambientes(estabelecimento_id);

WITH inferred AS (
  SELECT min(u.estabelecimento_id::text)::uuid AS estabelecimento_id
  FROM public.usuarios u
  WHERE u.estabelecimento_id IS NOT NULL
    AND (u.automacao_ambiente_celular IS NOT NULL OR u.automacao_ambiente_tablet IS NOT NULL)
  HAVING count(DISTINCT u.estabelecimento_id) = 1
)
UPDATE public.automacao_ambientes a
SET estabelecimento_id = inferred.estabelecimento_id
FROM inferred
WHERE a.estabelecimento_id IS NULL;

DROP POLICY IF EXISTS "Usuarios autenticados gerenciam ambientes" ON public.automacao_ambientes;
CREATE POLICY "automacao_ambientes_tenant_select" ON public.automacao_ambientes
FOR SELECT TO authenticated USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM public.administradores a WHERE a.id = auth.uid())
);
CREATE POLICY "automacao_ambientes_tenant_insert" ON public.automacao_ambientes
FOR INSERT TO authenticated WITH CHECK (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role))
);
CREATE POLICY "automacao_ambientes_tenant_update" ON public.automacao_ambientes
FOR UPDATE TO authenticated USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role))
) WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));
CREATE POLICY "automacao_ambientes_tenant_delete" ON public.automacao_ambientes
FOR DELETE TO authenticated USING (
  estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Usuarios autenticados gerenciam regras de automacao" ON public.automacao_regras;
CREATE POLICY "automacao_regras_tenant_select" ON public.automacao_regras
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.automacao_ambientes a
  WHERE a.id = automacao_regras.ambiente_id
    AND (a.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) OR EXISTS (SELECT 1 FROM public.administradores ad WHERE ad.id = auth.uid()))
));
CREATE POLICY "automacao_regras_tenant_insert" ON public.automacao_regras
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.automacao_ambientes a
  WHERE a.id = automacao_regras.ambiente_id
    AND a.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role))
));
CREATE POLICY "automacao_regras_tenant_update" ON public.automacao_regras
FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.automacao_ambientes a
  WHERE a.id = automacao_regras.ambiente_id
    AND a.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role))
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.automacao_ambientes a
  WHERE a.id = automacao_regras.ambiente_id
    AND a.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
));
CREATE POLICY "automacao_regras_tenant_delete" ON public.automacao_regras
FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.automacao_ambientes a
  WHERE a.id = automacao_regras.ambiente_id
    AND a.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
));

-- F03/F04: auditoria, idempotência e escopo dos disparos.
ALTER TABLE public.push_notifications_log ADD COLUMN IF NOT EXISTS estabelecimento_id uuid REFERENCES public.estabelecimentos(id);
ALTER TABLE public.push_notifications_log ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id);
ALTER TABLE public.push_notifications_log ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS push_log_tenant_idempotency_uq ON public.push_notifications_log(estabelecimento_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.sms_envios ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.sms_envios ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.sms_envios ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS sms_envios_tenant_idempotency_uq ON public.sms_envios(estabelecimento_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- F05: somente o serviço pode executar SQL dinâmico legado.
REVOKE ALL ON FUNCTION public.exec_readonly_select(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_readonly_select(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;