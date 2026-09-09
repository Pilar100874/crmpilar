CREATE POLICY "automacao_imagens_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'automacao');
CREATE POLICY "automacao_imagens_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'automacao');
CREATE POLICY "automacao_imagens_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'automacao') WITH CHECK (bucket_id = 'automacao');
CREATE POLICY "automacao_imagens_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'automacao');