-- COMPREHENSIVE RLS FIX PART 2 - Remaining tables

-- ==============================================
-- 9. QUICK ATTACHMENTS
-- ==============================================
DROP POLICY IF EXISTS "Users can view quick attachments from same estabelecimento" ON public.quick_attachments;
DROP POLICY IF EXISTS "Manage global quick attachments (same estab or init/admin)" ON public.quick_attachments;
DROP POLICY IF EXISTS "Users can manage own quick attachments" ON public.quick_attachments;

CREATE POLICY "View quick attachments (same estab or admin)"
ON public.quick_attachments FOR SELECT
TO authenticated
USING (
  (estabelecimento_id IS NULL)
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage global quick attachments (admin/gestor)"
ON public.quick_attachments FOR ALL
TO authenticated
USING (
  (is_global = true AND (
    (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
     AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
    OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  ))
  OR (user_id = auth.uid() AND is_global = false)
)
WITH CHECK (
  (is_global = true AND (
    (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
     AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
    OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  ))
  OR (user_id = auth.uid() AND is_global = false)
);

-- ==============================================
-- 10. QUICK REPLIES
-- ==============================================
DROP POLICY IF EXISTS "Users can view quick replies from same estabelecimento" ON public.quick_replies;
DROP POLICY IF EXISTS "Manage global quick replies (same estab or init/admin)" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can manage own quick replies" ON public.quick_replies;

CREATE POLICY "View quick replies (same estab or admin)"
ON public.quick_replies FOR SELECT
TO authenticated
USING (
  (estabelecimento_id IS NULL)
  OR (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage quick replies (admin/gestor or own)"
ON public.quick_replies FOR ALL
TO authenticated
USING (
  (is_global = true AND (
    (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
     AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
    OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  ))
  OR (user_id = auth.uid() AND is_global = false)
)
WITH CHECK (
  (is_global = true AND (
    (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
     AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
    OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
  ))
  OR (user_id = auth.uid() AND is_global = false)
);

-- ==============================================
-- 11. REDES SOCIAIS
-- ==============================================
DROP POLICY IF EXISTS "Users can view redes sociais from same estabelecimento" ON public.redes_sociais;
DROP POLICY IF EXISTS "Users can manage redes sociais from same estabelecimento" ON public.redes_sociais;

CREATE POLICY "View redes sociais (same estab or admin)"
ON public.redes_sociais FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage redes sociais (same estab admin/gestor or admin)"
ON public.redes_sociais FOR ALL
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
-- 12. RESEND CONFIG
-- ==============================================
DROP POLICY IF EXISTS "Users can view resend config from same estabelecimento" ON public.resend_config;
DROP POLICY IF EXISTS "Admins and gestores can manage resend config" ON public.resend_config;

CREATE POLICY "View resend config (same estab or admin)"
ON public.resend_config FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage resend config (admin/gestor or admin)"
ON public.resend_config FOR ALL
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
-- 13. SEGMENTOS
-- ==============================================
DROP POLICY IF EXISTS "Users can view segmentos from same estabelecimento" ON public.segmentos;
DROP POLICY IF EXISTS "Users can manage segmentos from same estabelecimento" ON public.segmentos;

CREATE POLICY "View segmentos (same estab or admin)"
ON public.segmentos FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage segmentos (admin/gestor or admin)"
ON public.segmentos FOR ALL
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
-- 14. UNIDADES
-- ==============================================
DROP POLICY IF EXISTS "Users can view unidades from same estabelecimento" ON public.unidades;
DROP POLICY IF EXISTS "Users can manage unidades from same estabelecimento" ON public.unidades;

CREATE POLICY "View unidades (same estab or admin)"
ON public.unidades FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage unidades (admin/gestor or admin)"
ON public.unidades FOR ALL
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