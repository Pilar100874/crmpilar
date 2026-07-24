
-- 1) TV workflow execuções: remove leitura anônima ampla; leitura passa por edge function com device token
DROP POLICY IF EXISTS "tv_wf_exec_select_anon" ON public.tv_workflow_execucoes;

-- 2) Atestados médicos: restringe leitura ao próprio funcionário OU a usuários do mesmo estabelecimento
DROP POLICY IF EXISTS "Func le proprios atestados" ON storage.objects;
CREATE POLICY "Func le proprios atestados"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ponto-atestados'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT (pf.id)::text FROM public.ponto_funcionarios pf WHERE pf.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.ponto_funcionarios pf
      JOIN public.ponto_empresas pe ON pe.id = pf.empresa_id
      WHERE (pf.id)::text = (storage.foldername(name))[1]
        AND pe.estabelecimento_id = public.get_auth_user_estabelecimento_id()
    )
  )
);

-- 3) cv-vehicle-photos: escrita deve respeitar o estabelecimento do usuário
DROP POLICY IF EXISTS "cv_photos_auth_insert" ON storage.objects;
CREATE POLICY "cv_photos_auth_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cv-vehicle-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.cv_cameras c
      WHERE (c.id)::text = (storage.foldername(name))[2]
        AND c.estabelecimento_id = public.get_auth_user_estabelecimento_id()
    )
    OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text
  )
);

-- 4) usuario_segmentos: usa roles_present() (tenant-scoped) em vez de checagem global de user_roles
DROP POLICY IF EXISTS "Users can manage usuario_segmentos" ON public.usuario_segmentos;
CREATE POLICY "Users can manage usuario_segmentos"
ON public.usuario_segmentos
FOR ALL
USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR NOT public.roles_present()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR NOT public.roles_present()
  )
);
