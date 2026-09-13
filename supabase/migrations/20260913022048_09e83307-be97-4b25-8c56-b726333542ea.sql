CREATE POLICY "apks_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'apks');

CREATE POLICY "apks_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apks');

CREATE POLICY "apks_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'apks')
  WITH CHECK (bucket_id = 'apks');

CREATE POLICY "apks_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'apks');