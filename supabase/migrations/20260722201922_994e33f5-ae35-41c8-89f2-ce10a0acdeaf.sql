
CREATE POLICY "policy_attachments read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'policy-attachments');

CREATE POLICY "policy_attachments write admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'policy-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "policy_attachments update admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'policy-attachments' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "policy_attachments delete admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'policy-attachments' AND public.has_role(auth.uid(), 'admin'));
