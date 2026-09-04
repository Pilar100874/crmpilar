DROP POLICY IF EXISTS cv_photos_auth_read ON storage.objects;
CREATE POLICY cv_photos_auth_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-vehicle-photos'
  AND (
    owner = auth.uid()
    OR is_system_admin()
    OR (storage.foldername(name))[1] = (get_auth_user_estabelecimento_id())::text
    OR EXISTS (
      SELECT 1 FROM public.cv_cameras c
      WHERE c.id::text = (storage.foldername(objects.name))[2]
        AND c.estabelecimento_id = get_auth_user_estabelecimento_id()
    )
  )
);