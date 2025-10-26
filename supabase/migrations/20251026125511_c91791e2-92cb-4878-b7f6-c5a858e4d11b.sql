-- COMPREHENSIVE RLS FIX PART 3 - Configuration tables

-- ==============================================
-- 15. CANAIS ATENDIMENTO
-- ==============================================
DROP POLICY IF EXISTS "View canais (init or same estab)" ON public.canais_atendimento;
DROP POLICY IF EXISTS "Manage canais (init or same estab)" ON public.canais_atendimento;

CREATE POLICY "View canais atendimento (same estab or admin)"
ON public.canais_atendimento FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage canais atendimento (admin/gestor or admin)"
ON public.canais_atendimento FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- ==============================================
-- 16. NOTIFICACOES CONFIG
-- ==============================================
DROP POLICY IF EXISTS "View notificacoes (init or same estab)" ON public.notificacoes_config;
DROP POLICY IF EXISTS "Manage notificacoes (init or same estab)" ON public.notificacoes_config;

CREATE POLICY "View notificacoes config (same estab or admin)"
ON public.notificacoes_config FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage notificacoes config (admin/gestor or admin)"
ON public.notificacoes_config FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- ==============================================
-- 17. SEGURANCA CONFIG
-- ==============================================
DROP POLICY IF EXISTS "View seguranca (init or same estab)" ON public.seguranca_config;
DROP POLICY IF EXISTS "Manage seguranca (init or same estab)" ON public.seguranca_config;

CREATE POLICY "View seguranca config (same estab or admin)"
ON public.seguranca_config FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage seguranca config (admin/gestor or admin)"
ON public.seguranca_config FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- ==============================================
-- 18. DATABASE CONNECTIONS
-- ==============================================
DROP POLICY IF EXISTS "View database connections (init or same estab)" ON public.database_connections;
DROP POLICY IF EXISTS "Manage database connections (init or permitted)" ON public.database_connections;

CREATE POLICY "View database connections (same estab or admin)"
ON public.database_connections FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage database connections (admin/gestor or admin)"
ON public.database_connections FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- ==============================================
-- 19. GRUPOS ACESSO
-- ==============================================
DROP POLICY IF EXISTS "View grupos_acesso (init or permitted)" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can insert grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can update grupos_acesso" ON public.grupos_acesso;
DROP POLICY IF EXISTS "Users can delete grupos_acesso" ON public.grupos_acesso;

CREATE POLICY "View grupos acesso (same estab or admin)"
ON public.grupos_acesso FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage grupos acesso (admin/gestor or admin)"
ON public.grupos_acesso FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);