
-- ============================================================
-- Multi-tenant hardening for storage buckets + ponto_atestados + dispositivos_rastreamento
-- ============================================================

-- Helper: user's ponto empresas via ponto_funcionarios
CREATE OR REPLACE FUNCTION public.get_user_ponto_empresa_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT empresa_id FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_user_ponto_empresa_ids() TO authenticated;

-- ============================================================
-- 1) ponto_atestados — scope RH/Func via ponto_funcionarios.empresa_id
-- ============================================================
DROP POLICY IF EXISTS "RH atualiza atestados" ON public.ponto_atestados;
DROP POLICY IF EXISTS "Func ve seus atestados" ON public.ponto_atestados;

CREATE POLICY "Func ve seus atestados" ON public.ponto_atestados
FOR SELECT TO authenticated
USING (
  funcionario_id IN (SELECT id FROM public.ponto_funcionarios WHERE auth_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.ponto_funcionarios f
    WHERE f.id = ponto_atestados.funcionario_id
      AND f.empresa_id IN (SELECT public.get_user_ponto_empresa_ids())
  )
  OR public.is_system_admin()
);

CREATE POLICY "RH atualiza atestados" ON public.ponto_atestados
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ponto_funcionarios f
    WHERE f.id = ponto_atestados.funcionario_id
      AND f.empresa_id IN (SELECT public.get_user_ponto_empresa_ids())
  )
  OR public.is_system_admin()
);

-- ============================================================
-- 2) dispositivos_rastreamento — tighten anon bootstrap insert
-- ============================================================
DROP POLICY IF EXISTS "Qualquer um pode registrar dispositivo" ON public.dispositivos_rastreamento;

CREATE POLICY "Bootstrap de dispositivo pendente"
ON public.dispositivos_rastreamento
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pendente'
  AND estabelecimento_id IS NULL
  AND usuario_id IS NULL
  AND device_uuid IS NOT NULL
  AND length(device_uuid) BETWEEN 8 AND 200
);

-- ============================================================
-- 3) Storage: ponto-faces (biometric) — 1st folder = ponto empresa_id
-- ============================================================
DROP POLICY IF EXISTS "ponto_faces_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "ponto_faces_auth_write" ON storage.objects;
DROP POLICY IF EXISTS "ponto_faces_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "ponto_faces_auth_delete" ON storage.objects;

CREATE POLICY "ponto_faces_tenant_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ponto-faces'
  AND (
    public.is_system_admin()
    OR ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_ponto_empresa_ids())
  )
);
CREATE POLICY "ponto_faces_tenant_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ponto-faces'
  AND (
    public.is_system_admin()
    OR ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_ponto_empresa_ids())
  )
);
CREATE POLICY "ponto_faces_tenant_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'ponto-faces'
  AND (
    public.is_system_admin()
    OR ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_ponto_empresa_ids())
  )
);
CREATE POLICY "ponto_faces_tenant_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'ponto-faces'
  AND (
    public.is_system_admin()
    OR ((storage.foldername(name))[1])::uuid IN (SELECT public.get_user_ponto_empresa_ids())
  )
);

-- ============================================================
-- 4) Storage: ponto-anexos — backend-only (service_role bypasses RLS)
-- ============================================================
DROP POLICY IF EXISTS "auth read ponto anexos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload ponto anexos" ON storage.objects;
DROP POLICY IF EXISTS "auth update ponto anexos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete ponto anexos" ON storage.objects;

CREATE POLICY "ponto_anexos_admin_only_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ponto-anexos' AND public.is_system_admin());

-- ============================================================
-- 5) Storage: pilar-hub-snapshots — 1st folder = user's estabelecimento_id
-- ============================================================
DROP POLICY IF EXISTS "Usuarios do estabelecimento podem ver snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode gerenciar snapshots" ON storage.objects;

CREATE POLICY "pilar_hub_snapshots_tenant_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'pilar-hub-snapshots'
  AND (
    public.is_system_admin()
    OR ((storage.foldername(name))[1])::uuid = public.get_auth_user_estabelecimento_id()
  )
);

-- ============================================================
-- 6) Storage: heatmap-screenshots — 2nd folder = user's estabelecimento_id
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can upload heatmap screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update heatmap screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read heatmap screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete heatmap screenshots" ON storage.objects;

CREATE POLICY "heatmap_tenant_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'heatmap-screenshots' AND (
    public.is_system_admin()
    OR (storage.foldername(name))[2] = public.get_auth_user_estabelecimento_id()::text
    OR (storage.foldername(name))[2] = 'global'
  )
);
CREATE POLICY "heatmap_tenant_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'heatmap-screenshots' AND (
    public.is_system_admin()
    OR (storage.foldername(name))[2] = public.get_auth_user_estabelecimento_id()::text
    OR (storage.foldername(name))[2] = 'global'
  )
);
CREATE POLICY "heatmap_tenant_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'heatmap-screenshots' AND (
    public.is_system_admin()
    OR (storage.foldername(name))[2] = public.get_auth_user_estabelecimento_id()::text
    OR (storage.foldername(name))[2] = 'global'
  )
);
CREATE POLICY "heatmap_tenant_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'heatmap-screenshots' AND (
    public.is_system_admin()
    OR (storage.foldername(name))[2] = public.get_auth_user_estabelecimento_id()::text
  )
);

-- ============================================================
-- 7) Storage: cv-vehicle-photos — restrict modify to owner or admin
-- ============================================================
DROP POLICY IF EXISTS "cv_photos_auth_read" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_auth_delete" ON storage.objects;

CREATE POLICY "cv_photos_auth_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-vehicle-photos' AND (
    owner = auth.uid()
    OR public.is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.cv_cameras c
      WHERE c.id::text = (storage.foldername(name))[2]
        AND c.estabelecimento_id = public.get_auth_user_estabelecimento_id()
    )
  )
);
CREATE POLICY "cv_photos_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cv-vehicle-photos');

CREATE POLICY "cv_photos_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'cv-vehicle-photos' AND (owner = auth.uid() OR public.is_system_admin()));

CREATE POLICY "cv_photos_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'cv-vehicle-photos' AND (owner = auth.uid() OR public.is_system_admin()));

-- ============================================================
-- 8) Multi-tenant public/mixed buckets — restrict UPDATE/DELETE to owner or admin
-- (produtos, bot-media, marketing-images, marketing-videos, marketing-audio,
--  marketing-assets, ecommerce-assets, report-assets, contagens-images,
--  catalog-ai-images, studio-gallery, agent-knowledge-base)
-- ============================================================

-- produtos
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Owner or admin can update product images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'produtos' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin can delete product images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'produtos' AND (owner = auth.uid() OR public.is_system_admin()));

-- bot-media
DROP POLICY IF EXISTS "Authenticated update bot-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete bot-media" ON storage.objects;
CREATE POLICY "Owner or admin update bot-media" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'bot-media' AND (owner = auth.uid() OR public.is_system_admin()))
WITH CHECK (bucket_id = 'bot-media' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin delete bot-media" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'bot-media' AND (owner = auth.uid() OR public.is_system_admin()));

-- marketing-images
DROP POLICY IF EXISTS "Allow authenticated users to update marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete marketing images" ON storage.objects;
CREATE POLICY "Owner or admin update marketing-images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'marketing-images' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin delete marketing-images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'marketing-images' AND (owner = auth.uid() OR public.is_system_admin()));

-- marketing-videos
DROP POLICY IF EXISTS "Allow authenticated users to update marketing videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete marketing videos" ON storage.objects;
CREATE POLICY "Owner or admin update marketing-videos" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'marketing-videos' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin delete marketing-videos" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'marketing-videos' AND (owner = auth.uid() OR public.is_system_admin()));

-- marketing-audio
DROP POLICY IF EXISTS "Allow authenticated users to update marketing audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete marketing audio" ON storage.objects;
CREATE POLICY "Owner or admin update marketing-audio" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'marketing-audio' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin delete marketing-audio" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'marketing-audio' AND (owner = auth.uid() OR public.is_system_admin()));

-- marketing-assets
DROP POLICY IF EXISTS "Users can delete marketing assets" ON storage.objects;
CREATE POLICY "Owner or admin delete marketing-assets" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'marketing-assets' AND (owner = auth.uid() OR public.is_system_admin()));

-- ecommerce-assets
DROP POLICY IF EXISTS "Authenticated users can update ecommerce assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ecommerce assets" ON storage.objects;
CREATE POLICY "Owner or admin update ecommerce-assets" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'ecommerce-assets' AND (owner = auth.uid() OR public.is_system_admin()));
CREATE POLICY "Owner or admin delete ecommerce-assets" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'ecommerce-assets' AND (owner = auth.uid() OR public.is_system_admin()));

-- report-assets
DROP POLICY IF EXISTS "Users can update their report assets" ON storage.objects;
CREATE POLICY "Owner or admin update report-assets" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'report-assets' AND (owner = auth.uid() OR public.is_system_admin()));

-- contagens-images
DROP POLICY IF EXISTS "Users can delete own contagens images" ON storage.objects;
CREATE POLICY "Owner or admin delete contagens-images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'contagens-images' AND (owner = auth.uid() OR public.is_system_admin()));

-- catalog-ai-images
DROP POLICY IF EXISTS "Users can delete catalog AI images" ON storage.objects;
CREATE POLICY "Owner or admin delete catalog-ai-images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'catalog-ai-images' AND (owner = auth.uid() OR public.is_system_admin()));

-- studio-gallery
DROP POLICY IF EXISTS "Users can delete studio gallery images" ON storage.objects;
CREATE POLICY "Owner or admin delete studio-gallery" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'studio-gallery' AND (owner = auth.uid() OR public.is_system_admin()));

-- agent-knowledge-base
DROP POLICY IF EXISTS "Authenticated users can delete KB files" ON storage.objects;
CREATE POLICY "Owner or admin delete agent-knowledge-base" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'agent-knowledge-base' AND (owner = auth.uid() OR public.is_system_admin()));
