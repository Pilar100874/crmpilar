
CREATE POLICY "ponto_faces_auth_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'ponto-faces');
CREATE POLICY "ponto_faces_auth_write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'ponto-faces');
CREATE POLICY "ponto_faces_auth_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'ponto-faces');
CREATE POLICY "ponto_faces_auth_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'ponto-faces');
