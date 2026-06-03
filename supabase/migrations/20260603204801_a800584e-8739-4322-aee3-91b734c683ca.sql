CREATE POLICY "Authenticated can upload heatmap screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'heatmap-screenshots');

CREATE POLICY "Authenticated can update heatmap screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'heatmap-screenshots');

CREATE POLICY "Authenticated can read heatmap screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'heatmap-screenshots');

CREATE POLICY "Authenticated can delete heatmap screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'heatmap-screenshots');