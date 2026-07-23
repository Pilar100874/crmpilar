
-- ============================================================================
-- FIX 1: cupons_desconto_anon_select
-- Remove anon SELECT policy that exposes all active coupon codes publicly.
-- Anonymous checkout should look up coupons by exact code via a SECURITY DEFINER
-- function instead (the app already has that path via applyCoupon → authenticated query).
-- ============================================================================
DROP POLICY IF EXISTS "Cupons ativos são visíveis publicamente" ON public.cupons_desconto;

-- ============================================================================
-- FIX 2: user_roles_bootstrap_insert
-- Remove client-callable bootstrap INSERT. Only existing admins (or service_role)
-- may insert roles. Initial admin provisioning is done via service_role.
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert roles or bootstrap" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================================
-- FIX 3: roles_present_global_fallback
-- Scope roles_present() to caller's estabelecimento so a brand-new tenant with
-- no roles doesn't get admin-like access system-wide.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.roles_present()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.usuarios u ON u.id = ur.user_id
    WHERE u.estabelecimento_id = public.get_auth_user_estabelecimento_id()
  )
$function$;

-- ============================================================================
-- FIX 4: storage_buckets_no_tenant_scoping
-- Enforce that uploads/updates/deletes on shared buckets stay inside the
-- caller's estabelecimento folder: <estabelecimento_id>/<...>.
-- Public read remains unchanged. system_admin bypass allowed.
-- ============================================================================

-- Drop the permissive INSERT policies
DROP POLICY IF EXISTS "Allow authenticated users to upload marketing audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload marketing videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload bot-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload KB files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contagens images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ecommerce assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload report assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload catalog AI images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload studio gallery images" ON storage.objects;

-- Create tenant-scoped INSERT policies (path must start with <estabelecimento_id>/)
CREATE POLICY "Tenant upload marketing-audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketing-audio'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload marketing-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketing-images'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload marketing-videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketing-videos'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload marketing-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketing-assets'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload bot-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bot-media'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload agent-knowledge-base"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agent-knowledge-base'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload contagens-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'contagens-images'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload ecommerce-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ecommerce-assets'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload produtos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'produtos'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload report-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-assets'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload catalog-ai-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'catalog-ai-images'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);

CREATE POLICY "Tenant upload studio-gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'studio-gallery'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = public.get_auth_user_estabelecimento_id()::text)
);
