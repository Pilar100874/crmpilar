-- Fix RLS policies to allow operations when no roles are configured
-- This prevents "new row violates row-level security policy" errors during initial setup

-- CANAIS_ATENDIMENTO
DROP POLICY IF EXISTS "Manage canais atendimento (admin/gestor or admin)" ON public.canais_atendimento;
CREATE POLICY "Manage canais atendimento (admin/gestor or admin)"
ON public.canais_atendimento
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- GRUPOS_ACESSO
DROP POLICY IF EXISTS "Manage grupos acesso (admin/gestor or admin)" ON public.grupos_acesso;
CREATE POLICY "Manage grupos acesso (admin/gestor or admin)"
ON public.grupos_acesso
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- NOTIFICACOES_CONFIG
DROP POLICY IF EXISTS "Manage notificacoes config (admin/gestor or admin)" ON public.notificacoes_config;
CREATE POLICY "Manage notificacoes config (admin/gestor or admin)"
ON public.notificacoes_config
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- REDES_SOCIAIS
DROP POLICY IF EXISTS "Manage redes sociais (same estab admin/gestor or admin)" ON public.redes_sociais;
CREATE POLICY "Manage redes sociais (same estab admin/gestor or admin)"
ON public.redes_sociais
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- SEGMENTOS
DROP POLICY IF EXISTS "Manage segmentos (admin/gestor or admin)" ON public.segmentos;
CREATE POLICY "Manage segmentos (admin/gestor or admin)"
ON public.segmentos
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- QUICK_REPLIES
DROP POLICY IF EXISTS "Manage quick replies (admin/gestor or own)" ON public.quick_replies;
CREATE POLICY "Manage quick replies (admin/gestor or own)"
ON public.quick_replies
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  OR (user_id = auth.uid())
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
  OR (user_id = auth.uid())
);

-- QUICK_ATTACHMENTS
DROP POLICY IF EXISTS "Manage global quick attachments (admin/gestor)" ON public.quick_attachments;
CREATE POLICY "Manage global quick attachments (admin/gestor)"
ON public.quick_attachments
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Manage customers (same estab admin/gestor or admin)" ON public.customers;
CREATE POLICY "Manage customers (same estab admin/gestor or admin)"
ON public.customers
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- SEGURANCA_CONFIG
DROP POLICY IF EXISTS "Manage seguranca config (admin/gestor or admin)" ON public.seguranca_config;
CREATE POLICY "Manage seguranca config (admin/gestor or admin)"
ON public.seguranca_config
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);

-- WEBHOOKS
DROP POLICY IF EXISTS "Manage webhooks (init or same estab)" ON public.webhooks;
CREATE POLICY "Manage webhooks (init or same estab)"
ON public.webhooks
FOR ALL
TO authenticated
USING (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
)
WITH CHECK (
  ((estabelecimento_id = get_user_estabelecimento_id(auth.uid())) 
   AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present()))
  OR (EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid()))
);