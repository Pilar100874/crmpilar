
DROP POLICY IF EXISTS "authenticated_read_pilar_hub_snapshots_storage" ON storage.objects;
CREATE POLICY "authenticated_read_pilar_hub_snapshots_storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pilar-hub-snapshots');

DROP POLICY IF EXISTS "service_role_all_pilar_hub_snapshots_storage" ON storage.objects;
CREATE POLICY "service_role_all_pilar_hub_snapshots_storage"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'pilar-hub-snapshots') WITH CHECK (bucket_id = 'pilar-hub-snapshots');
