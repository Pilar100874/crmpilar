CREATE POLICY "Autenticados leem arquivos de skills" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'aip-skills');
CREATE POLICY "Autenticados enviam arquivos de skills" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'aip-skills');
CREATE POLICY "Autenticados atualizam arquivos de skills" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'aip-skills') WITH CHECK (bucket_id = 'aip-skills');
CREATE POLICY "Autenticados removem arquivos de skills" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'aip-skills');