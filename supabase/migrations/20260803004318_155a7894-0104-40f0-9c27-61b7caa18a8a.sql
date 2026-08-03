CREATE POLICY "Autenticados leem artefatos do playwright"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'playwright-execucoes');

CREATE POLICY "Admins removem artefatos do playwright"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'playwright-execucoes' AND public.is_system_admin());