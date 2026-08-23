CREATE POLICY "Authenticated view op hub photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = ANY (ARRAY['task-photos','task-location-photos','irregularity-photos']));

GRANT EXECUTE ON FUNCTION public.get_user_estabelecimento_id(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_estabelecimento_id() TO anon;