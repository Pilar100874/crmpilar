-- COMPREHENSIVE RLS FIX FOR MULTI-ESTABELECIMENTO SYSTEM
-- This migration standardizes all RLS policies to prevent permission errors

-- ==============================================
-- 1. API ENDPOINTS
-- ==============================================
DROP POLICY IF EXISTS "Authenticated users can view api endpoints" ON public.api_endpoints;
DROP POLICY IF EXISTS "Users can manage api endpoints" ON public.api_endpoints;

CREATE POLICY "View api endpoints (same estab or admin)"
ON public.api_endpoints FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage api endpoints (same estab admin/gestor or admin)"
ON public.api_endpoints FOR ALL
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
-- 2. BOT FLOWS
-- ==============================================
DROP POLICY IF EXISTS "Users can view bot flows from same estabelecimento" ON public.bot_flows;
DROP POLICY IF EXISTS "Users can manage bot flows from same estabelecimento" ON public.bot_flows;

CREATE POLICY "View bot flows (same estab or admin)"
ON public.bot_flows FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage bot flows (same estab admin/gestor or admin)"
ON public.bot_flows FOR ALL
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
-- 3. CAMPAIGNS
-- ==============================================
DROP POLICY IF EXISTS "Users can view campaigns from same estabelecimento" ON public.campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns from same estabelecimento" ON public.campaigns;

CREATE POLICY "View campaigns (same estab or admin)"
ON public.campaigns FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage campaigns (same estab admin/gestor or admin)"
ON public.campaigns FOR ALL
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
-- 4. CONTENTS
-- ==============================================
DROP POLICY IF EXISTS "Users can view contents from same estabelecimento" ON public.contents;
DROP POLICY IF EXISTS "Users can manage contents from same estabelecimento" ON public.contents;

CREATE POLICY "View contents (same estab or admin)"
ON public.contents FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage contents (same estab admin/gestor or admin)"
ON public.contents FOR ALL
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
-- 5. CONVERSATIONS
-- ==============================================
DROP POLICY IF EXISTS "Users can view conversations from same estabelecimento" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations from same estabelecimento" ON public.conversations;

CREATE POLICY "View conversations (same estab or admin)"
ON public.conversations FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Insert conversations (same estab)"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Update conversations (same estab)"
ON public.conversations FOR UPDATE
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Delete conversations (same estab admin/gestor)"
ON public.conversations FOR DELETE
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()) 
   AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role)))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

-- ==============================================
-- 6. CUSTOMERS
-- ==============================================
DROP POLICY IF EXISTS "Users can view customers from same estabelecimento" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers from same estabelecimento" ON public.customers;

CREATE POLICY "View customers (same estab or admin)"
ON public.customers FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage customers (same estab admin/gestor or admin)"
ON public.customers FOR ALL
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
-- 7. FLOWS
-- ==============================================
DROP POLICY IF EXISTS "Users can view flows from same estabelecimento" ON public.flows;
DROP POLICY IF EXISTS "Users can manage flows from same estabelecimento" ON public.flows;

CREATE POLICY "View flows (same estab or admin)"
ON public.flows FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage flows (same estab admin/gestor or admin)"
ON public.flows FOR ALL
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
-- 8. FUNIL DEALS
-- ==============================================
DROP POLICY IF EXISTS "Users can view deals from same estabelecimento" ON public.funil_deals;
DROP POLICY IF EXISTS "Users can manage deals from same estabelecimento" ON public.funil_deals;

CREATE POLICY "View deals (same estab or admin)"
ON public.funil_deals FOR SELECT
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);

CREATE POLICY "Manage deals (same estab or admin)"
ON public.funil_deals FOR ALL
TO authenticated
USING (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
)
WITH CHECK (
  (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.administradores WHERE id = auth.uid()))
);